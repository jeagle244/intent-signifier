import { Pool, QueryResultRow } from "pg";

let pool: Pool | null = null;

function getConnectionString(): string {
  const url = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!url) throw new Error("POSTGRES_URL (or DATABASE_URL) is not set");
  return url;
}

function getPool(): Pool {
  if (!pool) {
    const connectionString = getConnectionString();
    const isLocal = /localhost|127\.0\.0\.1/.test(connectionString);
    pool = new Pool({
      connectionString,
      ssl: isLocal ? undefined : { rejectUnauthorized: false },
      max: 5,
    });
  }
  return pool;
}

/**
 * Small wrapper mimicking @neondatabase/serverless's `sql` API (tagged
 * template + `.query(text, params)`) but backed by plain `pg`, so the same
 * connection string works against a local Postgres (dev) or Neon (prod)
 * over standard TCP — no HTTP-proxy-only driver, no local proxy needed.
 */
async function sqlTag<T extends QueryResultRow = QueryResultRow>(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<T[]> {
  const text = strings.reduce((acc, str, i) => acc + str + (i < values.length ? `$${i + 1}` : ""), "");
  const result = await getPool().query<T>(text, values as never[]);
  return result.rows;
}

sqlTag.query = async <T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []): Promise<T[]> => {
  const result = await getPool().query<T>(text, params as never[]);
  return result.rows;
};

export const sql = sqlTag;
