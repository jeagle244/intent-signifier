import { readFileSync } from "fs";
import { join } from "path";
import { sql } from "@/lib/db";
import { SEED_COMPANIES, slugify } from "@/lib/seed-companies";

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

async function seedCompanies() {
  let inserted = 0;
  for (const company of SEED_COMPANIES) {
    const slug = slugify(company.name);
    const result = await sql.query(
      `INSERT INTO companies (slug, name, sector)
       VALUES ($1, $2, $3)
       ON CONFLICT (slug) DO NOTHING
       RETURNING id`,
      [slug, company.name, company.sector]
    );
    if (Array.isArray(result) && result.length > 0) inserted++;
  }
  return inserted;
}

export async function seedDatabase() {
  const statementCount = await applySchema();
  const inserted = await seedCompanies();
  return { statementCount, inserted, total: SEED_COMPANIES.length };
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

    try {
      const { statementCount, inserted, total } = await seedDatabase();
      console.log(`[seed-db] Applied schema (${statementCount} statements).`);
      console.log(`[seed-db] Inserted ${inserted} new companies (${total} total in seed list).`);
      process.exit(0);
    } catch (err) {
      console.error("[seed-db] Failed:", err);
      process.exit(1);
    }
  })();
}
