import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { sql } from "@/lib/db";
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
import { computePriorityScore } from "@/lib/priority";
import { AlertCandidate, postThresholdAlerts } from "@/lib/slack";
import { EventType, SignalCategory } from "@/lib/types";

// Concurrency, not just batching: scanning companies fully serial (5
// sequential category searches each) was estimated at 40-50+ minutes for
// just 173 of them — far past any realistic Vercel function timeout.
// Running companies concurrently (each company's own 5 categories still
// run sequentially within it) cuts wall-clock time by roughly this factor.
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
// Chipper Cash and Flutterwave aren't in the new 364-company list — Klarna/
// Monzo/Revolut are all Tier A (active_scan), "alma" is Tier C (inactive,
// so it should never appear in scan results even though it's listed here).
const DEMO_SIGNAL_OVERRIDES: Record<string, Partial<CategorySignals>> = {
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
  revolut: {
    negativePress: {
      points: 60,
      detail: "Minor regulatory scrutiny reported in one European market, no material impact disclosed.",
      sourceUrl: "https://reuters.com/example-revolut-reg",
      eventDate: "2026-06-20",
    },
  },
  alma: {
    layoffs: {
      points: 95,
      detail: "This should never appear — Alma is Tier C and excluded from active_scan.",
      sourceUrl: null,
      eventDate: null,
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

interface ScanCandidateRow {
  slug: string;
  name: string;
  tier: string;
  category: string;
  lemfi_relevance_score: number;
  competitive_notes: string | null;
  composite_score: number | null;
}

interface RankableCompanyRow {
  slug: string;
  name: string;
  sector: string;
  composite_score: number | null;
  previous_score: number | null;
  previous_rank: number | null;
  why_summary: string | null;
  priority_score: number | null;
}

function tierAwareWhySummary(tier: string, category: string, competitiveNotes: string | null): string {
  if (competitiveNotes) return `${tier} target (${category}). ${competitiveNotes}`;
  return `${tier} target (${category}) — no active signal detected this week`;
}

/**
 * Scans one company AND writes its result immediately — deliberately not
 * batched into a single end-of-run write. Vercel functions can time out
 * mid-scan; writing per-company means whatever's already been scanned by
 * that point is saved (and its API cost wasn't wasted), rather than an
 * all-or-nothing write at the end that a timeout would wipe out entirely.
 */
async function scanAndWriteCompany(candidate: ScanCandidateRow, demo: boolean) {
  console.log(`  Scanning: ${candidate.name}`);

  let signals: CategorySignals;
  try {
    signals = demo ? scanCompanyDemo(candidate.slug) : await scanCompanyReal(candidate.name);
  } catch (err) {
    console.error(`  Error scanning ${candidate.name}:`, err instanceof Error ? err.message : err);
    signals = {
      layoffs: null,
      leadershipExits: null,
      negativePress: null,
      glassdoorTrend: null,
      fundingDistress: null,
    };
  }

  const { compositeScore, subScores, whySummary, primaryCategory } = calculateScore(signals);
  const previousScore = candidate.composite_score;
  const finalWhySummary =
    compositeScore === null
      ? tierAwareWhySummary(candidate.tier, candidate.category, candidate.competitive_notes)
      : whySummary;
  const priorityScore = computePriorityScore(candidate.lemfi_relevance_score, compositeScore);

  const events = (Object.keys(signals) as SignalCategory[])
    .map((category) => ({ category, signal: signals[category] }))
    .filter((e): e is { category: SignalCategory; signal: DetectedSignal } => e.signal !== null);

  let sourcingAngle: string | null = null;
  if (primaryCategory) {
    try {
      sourcingAngle = await generateSourcingAngle(candidate.name, primaryCategory, signals[primaryCategory]!.detail, {
        tier: candidate.tier,
        category: candidate.category,
      });
    } catch (err) {
      console.error(`  Sourcing angle failed for ${candidate.name}:`, err instanceof Error ? err.message : err);
    }
  }

  const result = await sql`
    UPDATE companies SET
      composite_score = ${compositeScore},
      previous_score = ${previousScore},
      layoff_score = ${subScores.layoffs},
      leadership_exit_score = ${subScores.leadershipExits},
      press_score = ${subScores.negativePress},
      glassdoor_score = ${subScores.glassdoorTrend},
      funding_score = ${subScores.fundingDistress},
      why_summary = ${finalWhySummary},
      sourcing_angle = ${sourcingAngle},
      priority_score = ${priorityScore},
      last_scanned_at = now(),
      updated_at = now()
    WHERE slug = ${candidate.slug}
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

  return { slug: candidate.slug, compositeScore };
}

export async function runScan({ demo = false, baseUrl }: { demo?: boolean; baseUrl?: string } = {}) {
  // Only Tier A/B companies consume scan budget (active_scan = true — set
  // at seed time from the CSV's Tier column). Ordered by least-recently-
  // scanned first so coverage rotates through the full active list across
  // runs instead of always restarting from the same company and never
  // reaching the rest — the bug that caused today's incident. Relevance
  // breaks ties among equally-stale companies.
  const candidates = (await sql`
    SELECT slug, name, tier, category, lemfi_relevance_score, competitive_notes, composite_score
    FROM companies
    WHERE active_scan = true
    ORDER BY last_scanned_at ASC NULLS FIRST, lemfi_relevance_score DESC
  `) as unknown as ScanCandidateRow[];

  console.log(`[run-scan] Starting ${demo ? "DEMO" : "REAL"} scan of ${candidates.length} active companies...`);

  const results: { slug: string; compositeScore: number | null }[] = [];
  for (let i = 0; i < candidates.length; i += CONCURRENCY) {
    const chunk = candidates.slice(i, i + CONCURRENCY);
    const chunkResults = await Promise.all(
      chunk.map((candidate) =>
        scanAndWriteCompany(candidate, demo).catch((err) => {
          console.error(`  Failed to scan/write ${candidate.name}:`, err instanceof Error ? err.message : err);
          return null;
        })
      )
    );
    results.push(...chunkResults.filter((r): r is NonNullable<typeof r> => r !== null));

    if (!demo && i + CONCURRENCY < candidates.length) await delay(CHUNK_DELAY_MS);
  }

  console.log(`[run-scan] Scanned & wrote ${results.length}/${candidates.length} companies.`);

  // Fast pass, no external API calls left — safe even if the scan above
  // got cut short by a timeout, since it only touches whatever's currently
  // in the DB rather than depending on `results` covering everyone. Ranks
  // by priority_score (the league table's actual default sort) across ALL
  // 364 companies, not just the ones actively scanned this run.
  const generatedAt = new Date().toISOString();
  const allRows = (await sql`
    SELECT slug, name, sector, composite_score, previous_score, previous_rank, why_summary, priority_score
    FROM companies
  `) as unknown as RankableCompanyRow[];

  const ranked = [...allRows].sort((a, b) => (b.priority_score ?? -1) - (a.priority_score ?? -1));
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
