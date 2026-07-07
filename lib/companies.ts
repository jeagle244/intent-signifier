import { sql } from "@/lib/db";
import { computeTrend } from "@/lib/trend";
import { CompanyDetail, CompanyEvent, CompanySummary, Sector, SubScores } from "@/lib/types";

interface CompanyRow {
  slug: string;
  name: string;
  sector: string;
  composite_score: number | null;
  previous_score: number | null;
  layoff_score: number | null;
  leadership_exit_score: number | null;
  press_score: number | null;
  glassdoor_score: number | null;
  funding_score: number | null;
  why_summary: string | null;
  sourcing_angle: string | null;
  last_scanned_at: string | Date | null;
}

interface EventRow {
  id: number;
  event_type: string;
  event_date: string | Date | null;
  description: string;
  source_url: string | null;
  points_contributed: number | null;
}

function toIsoDate(value: string | Date | null): string | null {
  if (!value) return null;
  return new Date(value).toISOString().slice(0, 10);
}

function toIsoDateTime(value: string | Date | null): string | null {
  if (!value) return null;
  return new Date(value).toISOString();
}

function toSubScores(row: CompanyRow): SubScores {
  return {
    layoffs: row.layoff_score,
    leadershipExits: row.leadership_exit_score,
    negativePress: row.press_score,
    glassdoorTrend: row.glassdoor_score,
    fundingDistress: row.funding_score,
  };
}

function toSummary(row: CompanyRow): CompanySummary {
  return {
    slug: row.slug,
    name: row.name,
    sector: row.sector as Sector,
    compositeScore: row.composite_score,
    previousScore: row.previous_score,
    trend: computeTrend(row.composite_score, row.previous_score),
    whySummary: row.why_summary,
    subScores: toSubScores(row),
    lastScannedAt: toIsoDateTime(row.last_scanned_at),
  };
}

export async function getAllCompanies(): Promise<CompanySummary[]> {
  const rows = (await sql`
    SELECT slug, name, sector, composite_score, previous_score,
           layoff_score, leadership_exit_score, press_score, glassdoor_score, funding_score,
           why_summary, sourcing_angle, last_scanned_at
    FROM companies
    ORDER BY composite_score DESC NULLS LAST
  `) as unknown as CompanyRow[];

  return rows.map(toSummary);
}

export async function getLatestScanTimestamp(): Promise<string | null> {
  const rows = (await sql`SELECT max(last_scanned_at) AS last_scanned_at FROM companies`) as unknown as {
    last_scanned_at: string | Date | null;
  }[];
  return toIsoDateTime(rows[0]?.last_scanned_at ?? null);
}

export async function getCompanyBySlug(slug: string): Promise<CompanyDetail | null> {
  const rows = (await sql`
    SELECT slug, name, sector, composite_score, previous_score,
           layoff_score, leadership_exit_score, press_score, glassdoor_score, funding_score,
           why_summary, sourcing_angle, last_scanned_at
    FROM companies
    WHERE slug = ${slug}
  `) as unknown as CompanyRow[];

  const row = rows[0];
  if (!row) return null;

  const eventRows = (await sql`
    SELECT e.id, e.event_type, e.event_date, e.description, e.source_url, e.points_contributed
    FROM events e
    JOIN companies c ON c.id = e.company_id
    WHERE c.slug = ${slug}
    ORDER BY e.event_date DESC NULLS LAST, e.created_at DESC
  `) as unknown as EventRow[];

  const events: CompanyEvent[] = eventRows.map((e) => ({
    id: e.id,
    eventType: e.event_type as CompanyEvent["eventType"],
    eventDate: toIsoDate(e.event_date),
    description: e.description,
    sourceUrl: e.source_url,
    pointsContributed: e.points_contributed,
  }));

  return {
    ...toSummary(row),
    sourcingAngle: row.sourcing_angle,
    events,
  };
}
