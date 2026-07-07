import demoSnapshot from "@/data/demo-snapshot.json";
import { CompanyDetail, CompanySummary } from "@/lib/types";

/**
 * Step-1 data source: reads the hand-written fixture so the UI can be built
 * and iterated on before the real scoring pipeline (lib/db.ts) exists.
 * Swapped out for real Postgres queries once scripts/run-scan.ts is wired up.
 */

type DemoCompany = (typeof demoSnapshot)["companies"][number];

function toSummary(c: DemoCompany): CompanySummary {
  return {
    slug: c.slug,
    name: c.name,
    sector: c.sector as CompanySummary["sector"],
    compositeScore: c.compositeScore,
    previousScore: c.previousScore,
    trend: c.trend as CompanySummary["trend"],
    whySummary: c.whySummary,
    subScores: c.subScores,
    lastScannedAt: c.lastScannedAt,
  };
}

export function getDemoGeneratedAt(): string {
  return demoSnapshot.generatedAt;
}

export function getAllCompanies(): CompanySummary[] {
  return demoSnapshot.companies
    .map(toSummary)
    .sort((a, b) => (b.compositeScore ?? -1) - (a.compositeScore ?? -1));
}

export function getCompanyBySlug(slug: string): CompanyDetail | null {
  const c = demoSnapshot.companies.find((company) => company.slug === slug);
  if (!c) return null;
  return {
    ...toSummary(c),
    sourcingAngle: c.sourcingAngle,
    events: c.events as CompanyDetail["events"],
  };
}
