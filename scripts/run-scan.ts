import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { sql } from "@/lib/db";
import { SEED_COMPANIES, slugify } from "@/lib/seed-companies";
import { buildSearchQueries } from "@/lib/search/queries";
import { searchWeb, delay } from "@/lib/search/web-search";
import {
  detectFundingDistress,
  detectGlassdoorTrend,
  detectLayoffs,
  detectNegativePress,
} from "@/lib/scoring/parse-signals";
import { detectLeadershipExit } from "@/lib/scoring/leadership-exits";
import { calculateScore, CategorySignals } from "@/lib/scoring/calculate-score";
import { DetectedSignal } from "@/lib/scoring/signal-types";
import { generateSourcingAngle } from "@/lib/sourcing-angle";
import { AlertCandidate, postThresholdAlerts } from "@/lib/slack";
import { EventType, SignalCategory } from "@/lib/types";

// Concurrency, not just batching: 173 companies x 5 sequential category
// searches each, fully serial, was estimated at 40-50+ minutes — far past
// any realistic Vercel function timeout. Running companies concurrently
// (each company's own 5 categories still run sequentially within it) cuts
// wall-clock time by roughly this factor, without changing per-company logic.
const CONCURRENCY = 8;
const CHUNK_DELAY_MS = 1000;
const QUERY_DELAY_MS = 500;

const EVENT_TYPE_BY_CATEGORY: Record<SignalCategory, EventType> = {
  layoffs: "layoff",
  leadershipExits: "leadership_exit",
  negativePress: "negative_press",
  glassdoorTrend: "glassdoor",
  fundingDistress: "funding_distress",
};

const NON_LEADERSHIP_DETECTORS: Record<
  Exclude<SignalCategory, "leadershipExits">,
  (text: string) => DetectedSignal | null
> = {
  layoffs: detectLayoffs,
  negativePress: detectNegativePress,
  glassdoorTrend: detectGlassdoorTrend,
  fundingDistress: detectFundingDistress,
};

async function scanCompanyReal(name: string): Promise<CategorySignals> {
  const queries = buildSearchQueries(name);
  const categories = Object.keys(queries) as SignalCategory[];
  const signals = {} as CategorySignals;

  for (const category of categories) {
    const text = await searchWeb(queries[category]);
    await delay(QUERY_DELAY_MS);
    signals[category] =
      category === "leadershipExits" ? detectLeadershipExit(text) : NON_LEADERSHIP_DETECTORS[category](text);
  }

  return signals;
}

// Fixture signals for a handful of companies so `--demo` exercises every
// code path (mixed signals, insufficient data, high/low scores) without
// calling Anthropic. Mirrors the old bot's generateDemoSnapshot() pattern.
const DEMO_SIGNAL_OVERRIDES: Record<string, Partial<CategorySignals>> = {
  chipper: {
    layoffs: {
      points: 95,
      detail: "Chipper Cash lays off approximately 30% of remaining staff amid continued restructuring.",
      sourceUrl: "https://techcrunch.com/example-chipper-layoffs",
      eventDate: "2026-03-14",
    },
    leadershipExits: {
      points: 90,
      detail: "CTO departs Chipper Cash after 4 years, no replacement named.",
      sourceUrl: "https://techcrunch.com/example-chipper-cto",
      eventDate: "2026-03-02",
    },
    fundingDistress: {
      points: 80,
      detail: "Reports of a bridge round at a reduced valuation following a delayed Series D close.",
      sourceUrl: "https://theblock.co/example-chipper-bridge",
      eventDate: "2026-02-20",
    },
  },
  klarna: {
    layoffs: {
      points: 90,
      detail: "Klarna lays off 700 employees, roughly 10% of workforce, citing AI-driven efficiency gains.",
      sourceUrl: "https://bloomberg.com/example-klarna-layoffs",
      eventDate: "2026-06-10",
    },
    glassdoorTrend: {
      points: 60,
      detail: "Glassdoor rating drops from 3.9 to 3.4 following layoff announcement.",
      sourceUrl: "https://glassdoor.com/example-klarna",
      eventDate: "2026-06-15",
    },
  },
  "monzo-bank": {
    leadershipExits: {
      points: 60,
      detail: "Head of Engineering departs Monzo for an external opportunity, no internal backfill announced.",
      sourceUrl: "https://linkedin.com/example-monzo-head-eng",
      eventDate: "2026-06-25",
    },
  },
  flutterwave: {
    negativePress: {
      points: 80,
      detail: "Flutterwave faces regulatory challenges in multiple African markets over licensing compliance.",
      sourceUrl: "https://reuters.com/example-flutterwave-reg",
      eventDate: "2026-05-30",
    },
  },
  revolut: {
    negativePress: {
      points: 60,
      detail: "Minor regulatory scrutiny reported in one European market, no material impact disclosed.",
      sourceUrl: "https://reuters.com/example-revolut-reg",
      eventDate: "2026-06-20",
    },
  },
};

function scanCompanyDemo(slug: string): CategorySignals {
  const overrides = DEMO_SIGNAL_OVERRIDES[slug] || {};
  return {
    layoffs: overrides.layoffs ?? null,
    leadershipExits: overrides.leadershipExits ?? null,
    negativePress: overrides.negativePress ?? null,
    glassdoorTrend: overrides.glassdoorTrend ?? null,
    fundingDistress: overrides.fundingDistress ?? null,
  };
}

interface ExistingCompanyRow {
  slug: string;
  composite_score: number | null;
  previous_rank: number | null;
}

interface RankableCompanyRow {
  slug: string;
  name: string;
  sector: string;
  composite_score: number | null;
  previous_score: number | null;
  previous_rank: number | null;
  why_summary: string | null;
}

/**
 * Scans one company AND writes its result immediately — deliberately not
 * batched into a single end-of-run write. Vercel functions can time out
 * mid-scan; writing per-company means whatever's already been scanned by
 * that point is saved (and its API cost wasn't wasted), rather than an
 * all-or-nothing write at the end that a timeout would wipe out entirely.
 */
async function scanAndWriteCompany(
  company: (typeof SEED_COMPANIES)[number],
  demo: boolean,
  existingBySlug: Map<string, ExistingCompanyRow>
) {
  const slug = slugify(company.name);
  console.log(`  Scanning: ${company.name}`);

  let signals: CategorySignals;
  try {
    signals = demo ? scanCompanyDemo(slug) : await scanCompanyReal(company.name);
  } catch (err) {
    console.error(`  Error scanning ${company.name}:`, err instanceof Error ? err.message : err);
    signals = {
      layoffs: null,
      leadershipExits: null,
      negativePress: null,
      glassdoorTrend: null,
      fundingDistress: null,
    };
  }

  const { compositeScore, subScores, whySummary, primaryCategory } = calculateScore(signals);
  const existing = existingBySlug.get(slug);
  const previousScore = existing?.composite_score ?? null;
  const finalWhySummary = compositeScore === null ? "Insufficient data — no signals detected in latest scan" : whySummary;

  const events = (Object.keys(signals) as SignalCategory[])
    .map((category) => ({ category, signal: signals[category] }))
    .filter((e): e is { category: SignalCategory; signal: DetectedSignal } => e.signal !== null);

  let sourcingAngle: string | null = null;
  if (primaryCategory) {
    try {
      sourcingAngle = await generateSourcingAngle(company.name, primaryCategory, signals[primaryCategory]!.detail);
    } catch (err) {
      console.error(`  Sourcing angle failed for ${company.name}:`, err instanceof Error ? err.message : err);
    }
  }

  const result = await sql`
    INSERT INTO companies (
      slug, name, sector, composite_score, previous_score,
      layoff_score, leadership_exit_score, press_score, glassdoor_score, funding_score,
      why_summary, sourcing_angle, last_scanned_at
    ) VALUES (
      ${slug}, ${company.name}, ${company.sector}, ${compositeScore}, ${previousScore},
      ${subScores.layoffs}, ${subScores.leadershipExits}, ${subScores.negativePress},
      ${subScores.glassdoorTrend}, ${subScores.fundingDistress},
      ${finalWhySummary}, ${sourcingAngle}, now()
    )
    ON CONFLICT (slug) DO UPDATE SET
      name = EXCLUDED.name,
      sector = EXCLUDED.sector,
      composite_score = EXCLUDED.composite_score,
      previous_score = EXCLUDED.previous_score,
      layoff_score = EXCLUDED.layoff_score,
      leadership_exit_score = EXCLUDED.leadership_exit_score,
      press_score = EXCLUDED.press_score,
      glassdoor_score = EXCLUDED.glassdoor_score,
      funding_score = EXCLUDED.funding_score,
      why_summary = EXCLUDED.why_summary,
      sourcing_angle = EXCLUDED.sourcing_angle,
      last_scanned_at = now(),
      updated_at = now()
    RETURNING id
  `;
  const companyId = (result as unknown as { id: number }[])[0].id;

  for (const { category, signal } of events) {
    await sql`
      INSERT INTO events (company_id, event_type, event_date, description, source_url, points_contributed)
      VALUES (${companyId}, ${EVENT_TYPE_BY_CATEGORY[category]}, ${signal.eventDate}, ${signal.detail}, ${signal.sourceUrl}, ${signal.points})
      ON CONFLICT (company_id, event_type, event_date) WHERE event_date IS NOT NULL DO NOTHING
    `;
  }

  return { slug, compositeScore };
}

export async function runScan({ demo = false, baseUrl }: { demo?: boolean; baseUrl?: string } = {}) {
  console.log(`[run-scan] Starting ${demo ? "DEMO" : "REAL"} scan of ${SEED_COMPANIES.length} companies...`);

  const existingRows = (await sql`SELECT slug, composite_score, previous_rank FROM companies`) as unknown as ExistingCompanyRow[];
  const existingBySlug = new Map(existingRows.map((r) => [r.slug, r]));

  const results: { slug: string; compositeScore: number | null }[] = [];
  for (let i = 0; i < SEED_COMPANIES.length; i += CONCURRENCY) {
    const chunk = SEED_COMPANIES.slice(i, i + CONCURRENCY);
    const chunkResults = await Promise.all(
      chunk.map((company) =>
        scanAndWriteCompany(company, demo, existingBySlug).catch((err) => {
          console.error(`  Failed to scan/write ${company.name}:`, err instanceof Error ? err.message : err);
          return null;
        })
      )
    );
    results.push(...chunkResults.filter((r): r is NonNullable<typeof r> => r !== null));

    if (!demo && i + CONCURRENCY < SEED_COMPANIES.length) await delay(CHUNK_DELAY_MS);
  }

  console.log(`[run-scan] Scanned & wrote ${results.length}/${SEED_COMPANIES.length} companies.`);

  // Fast pass, no external API calls left — safe even if the scan above
  // got cut short by a timeout, since it only touches whatever's currently
  // in the DB rather than depending on `results` covering everyone.
  const generatedAt = new Date().toISOString();
  const allRows = (await sql`
    SELECT slug, name, sector, composite_score, previous_score, previous_rank, why_summary
    FROM companies
  `) as unknown as RankableCompanyRow[];

  const ranked = [...allRows].sort((a, b) => (b.composite_score ?? -1) - (a.composite_score ?? -1));
  const alertCandidates: AlertCandidate[] = [];

  for (let i = 0; i < ranked.length; i++) {
    const row = ranked[i];
    const rank = i + 1;
    await sql`UPDATE companies SET previous_rank = ${rank} WHERE slug = ${row.slug}`;
    alertCandidates.push({
      slug: row.slug,
      name: row.name,
      sector: row.sector,
      compositeScore: row.composite_score,
      previousScore: row.previous_score,
      rank,
      priorRank: row.previous_rank,
      whySummary: row.why_summary,
    });
  }

  const alertResult = await postThresholdAlerts(alertCandidates, generatedAt, baseUrl).catch((err) => {
    console.error("[run-scan] Slack alert failed:", err instanceof Error ? err.message : err);
    return { skipped: true as const };
  });

  console.log(
    `[run-scan] Complete. ${results.filter((c) => c.compositeScore !== null).length}/${results.length} companies scored this run.`
  );

  return { generatedAt, scannedCount: results.length, alertResult };
}

if (require.main === module) {
  const demo = process.argv.includes("--demo");
  runScan({ demo })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[run-scan] Fatal error:", err);
      process.exit(1);
    });
}
