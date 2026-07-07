import { config } from "dotenv";
config({ path: ".env.local" });
config();
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
  console.log(`[seed-db] Applied schema (${statements.length} statements).`);
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
  console.log(`[seed-db] Inserted ${inserted} new companies (${SEED_COMPANIES.length} total in seed list).`);
}

async function main() {
  await applySchema();
  await seedCompanies();
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[seed-db] Failed:", err);
    process.exit(1);
  });
