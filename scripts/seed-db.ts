import { readFileSync } from "fs";
import { join } from "path";
import { sql } from "@/lib/db";
import { loadSeedCompanies, slugify } from "@/lib/seed-companies";
import { computePriorityScore } from "@/lib/priority";

async function resetTables() {
  await sql.query("DROP TABLE IF EXISTS events");
  await sql.query("DROP TABLE IF EXISTS companies");
}

async function applySchema() {
  const schemaPath = join(process.cwd(), "lib", "schema.sql");
  const schema = readFileSync(schemaPath, "utf8");
  const withoutComments = schema
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
  const statements = withoutComments
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await sql.query(statement);
  }
  return statements.length;
}

/**
 * Upserts relevance-side columns (tier, category, sub-factors, etc.) so a
 * future CSV refresh updates business-fit data without wiping accumulated
 * scan history (composite_score, events, last_scanned_at) for companies
 * that persist across list updates — those columns are deliberately left
 * out of the UPDATE SET below.
 */
async function seedCompanies() {
  const companies = loadSeedCompanies();

  const existingRows = (await sql`SELECT slug, composite_score FROM companies`) as unknown as {
    slug: string;
    composite_score: number | null;
  }[];
  const existingIntentBySlug = new Map(existingRows.map((r) => [r.slug, r.composite_score]));

  let inserted = 0;
  let updated = 0;

  for (const company of companies) {
    const slug = slugify(company.name);
    const existingIntent = existingIntentBySlug.get(slug) ?? null;
    const priorityScore = computePriorityScore(company.relevanceScore, existingIntent);

    const result = await sql.query(
      `INSERT INTO companies (
         slug, name, sector, category, tier, active_scan, lemfi_relevance_score,
         category_fit, market_overlap, product_adjacency, talent_poachability, growth_heat,
         main_location, status, funding_stage, valuation_band, valuation_notes,
         data_confidence, competitive_notes, priority_score
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
       ON CONFLICT (slug) DO UPDATE SET
         name = EXCLUDED.name,
         sector = EXCLUDED.sector,
         category = EXCLUDED.category,
         tier = EXCLUDED.tier,
         active_scan = EXCLUDED.active_scan,
         lemfi_relevance_score = EXCLUDED.lemfi_relevance_score,
         category_fit = EXCLUDED.category_fit,
         market_overlap = EXCLUDED.market_overlap,
         product_adjacency = EXCLUDED.product_adjacency,
         talent_poachability = EXCLUDED.talent_poachability,
         growth_heat = EXCLUDED.growth_heat,
         main_location = EXCLUDED.main_location,
         status = EXCLUDED.status,
         funding_stage = EXCLUDED.funding_stage,
         valuation_band = EXCLUDED.valuation_band,
         valuation_notes = EXCLUDED.valuation_notes,
         data_confidence = EXCLUDED.data_confidence,
         competitive_notes = EXCLUDED.competitive_notes,
         priority_score = EXCLUDED.priority_score,
         updated_at = now()
       RETURNING id, (xmax = 0) AS inserted`,
      [
        slug,
        company.name,
        company.sector,
        company.category,
        company.tier,
        company.activeScan,
        company.relevanceScore,
        company.categoryFit,
        company.marketOverlap,
        company.productAdjacency,
        company.talentPoachability,
        company.growthHeat,
        company.mainLocation,
        company.status,
        company.fundingStage,
        company.valuationBand,
        company.valuationNotes,
        company.dataConfidence,
        company.competitiveNotes,
        priorityScore,
      ]
    );
    const row = (result as unknown as { inserted: boolean }[])[0];
    if (row?.inserted) inserted++;
    else updated++;
  }

  return { inserted, updated, total: companies.length };
}

export async function seedDatabase({ reset = false }: { reset?: boolean } = {}) {
  if (reset) await resetTables();
  const statementCount = await applySchema();
  const { inserted, updated, total } = await seedCompanies();
  return { statementCount, inserted, updated, total };
}

if (require.main === module) {
  // CLI entry — loads .env.local for local dev, since production seeding
  // goes through app/api/cron/seed/route.ts instead (Vercel's "Sensitive"
  // env vars, like POSTGRES_URL here, aren't readable outside the deployed
  // runtime, so `vercel env pull` can't get a usable value for this script).
  (async () => {
    const { config } = await import("dotenv");
    config({ path: ".env.local" });
    config();

    const reset = process.argv.includes("--reset");

    try {
      const { statementCount, inserted, updated, total } = await seedDatabase({ reset });
      console.log(`[seed-db] Applied schema (${statementCount} statements)${reset ? " after reset" : ""}.`);
      console.log(`[seed-db] Inserted ${inserted}, updated ${updated} companies (${total} total in seed list).`);
      process.exit(0);
    } catch (err) {
      console.error("[seed-db] Failed:", err);
      process.exit(1);
    }
  })();
}
