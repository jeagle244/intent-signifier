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
import { AlertCandidate, postThresholdAlerts } from "@/lib/slack";
import { EventType, SignalCategory, SubScores } from "@/lib/types";

const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 2000;
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

interface ScannedCompany {
  slug: string;
  name: string;
  sector: string;
  compositeScore: number | null;
  previousScore: number | null;
  priorRank: number | null;
  whySummary: string | null;
  subScores: SubScores;
  events: { category: SignalCategory; signal: DetectedSignal }[];
}

export async function runScan({ demo = false, baseUrl }: { demo?: boolean; baseUrl?: string } = {}) {
  console.log(`[run-scan] Starting ${demo ? "DEMO" : "REAL"} scan of ${SEED_COMPANIES.length} companies...`);

  const existingRows = (await sql`SELECT slug, composite_score, previous_rank FROM companies`) as unknown as ExistingCompanyRow[];
  const existingBySlug = new Map(existingRows.map((r) => [r.slug, r]));

  const scanned: ScannedCompany[] = [];
  const batches: (typeof SEED_COMPANIES)[] = [];
  for (let i = 0; i < SEED_COMPANIES.length; i += BATCH_SIZE) {
    batches.push(SEED_COMPANIES.slice(i, i + BATCH_SIZE));
  }

  for (const batch of batches) {
    for (const company of batch) {
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

      const { compositeScore, subScores, whySummary } = calculateScore(signals);
      const existing = existingBySlug.get(slug);

      const events = (Object.keys(signals) as SignalCategory[])
        .map((category) => ({ category, signal: signals[category] }))
        .filter((e): e is { category: SignalCategory; signal: DetectedSignal } => e.signal !== null);

      scanned.push({
        slug,
        name: company.name,
        sector: company.sector,
        compositeScore,
        previousScore: existing?.composite_score ?? null,
        priorRank: existing?.previous_rank ?? null,
        whySummary: compositeScore === null ? "Insufficient data — no signals detected in latest scan" : whySummary,
        subScores,
        events,
      });

      if (!demo) await delay(BATCH_DELAY_MS);
    }
  }

  // Rank now, so this run's rank can be stored as next run's "prior rank".
  const ranked = [...scanned].sort((a, b) => (b.compositeScore ?? -1) - (a.compositeScore ?? -1));
  const rankBySlug = new Map(ranked.map((c, i) => [c.slug, i + 1]));

  const generatedAt = new Date().toISOString();
  const alertCandidates: AlertCandidate[] = [];

  for (const company of scanned) {
    const rank = rankBySlug.get(company.slug)!;

    const result = await sql`
      INSERT INTO companies (
        slug, name, sector, composite_score, previous_score, previous_rank,
        layoff_score, leadership_exit_score, press_score, glassdoor_score, funding_score,
        why_summary, last_scanned_at
      ) VALUES (
        ${company.slug}, ${company.name}, ${company.sector}, ${company.compositeScore}, ${company.previousScore}, ${rank},
        ${company.subScores.layoffs}, ${company.subScores.leadershipExits}, ${company.subScores.negativePress},
        ${company.subScores.glassdoorTrend}, ${company.subScores.fundingDistress},
        ${company.whySummary}, now()
      )
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        sector = EXCLUDED.sector,
        composite_score = EXCLUDED.composite_score,
        previous_score = EXCLUDED.previous_score,
        previous_rank = EXCLUDED.previous_rank,
        layoff_score = EXCLUDED.layoff_score,
        leadership_exit_score = EXCLUDED.leadership_exit_score,
        press_score = EXCLUDED.press_score,
        glassdoor_score = EXCLUDED.glassdoor_score,
        funding_score = EXCLUDED.funding_score,
        why_summary = EXCLUDED.why_summary,
        last_scanned_at = now(),
        updated_at = now()
      RETURNING id
    `;
    const companyId = (result as unknown as { id: number }[])[0].id;

    for (const { category, signal } of company.events) {
      await sql`
        INSERT INTO events (company_id, event_type, event_date, description, source_url, points_contributed)
        VALUES (${companyId}, ${EVENT_TYPE_BY_CATEGORY[category]}, ${signal.eventDate}, ${signal.detail}, ${signal.sourceUrl}, ${signal.points})
        ON CONFLICT (company_id, event_type, event_date) WHERE event_date IS NOT NULL DO NOTHING
      `;
    }

    alertCandidates.push({
      slug: company.slug,
      name: company.name,
      sector: company.sector,
      compositeScore: company.compositeScore,
      previousScore: company.previousScore,
      rank,
      priorRank: company.priorRank,
      whySummary: company.whySummary,
    });
  }

  const alertResult = await postThresholdAlerts(alertCandidates, generatedAt, baseUrl).catch((err) => {
    console.error("[run-scan] Slack alert failed:", err instanceof Error ? err.message : err);
    return { skipped: true as const };
  });

  console.log(
    `[run-scan] Complete. ${scanned.filter((c) => c.compositeScore !== null).length}/${scanned.length} companies scored.`
  );

  return { generatedAt, scannedCount: scanned.length, alertResult };
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
