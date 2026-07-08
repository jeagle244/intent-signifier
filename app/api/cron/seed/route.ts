import { NextRequest, NextResponse } from "next/server";

/**
 * One-off production DB setup, run manually once after first deploy.
 * Lives under api/cron/ so it inherits that path's proxy.ts exclusion
 * (no session cookie needed) and reuses CRON_SECRET rather than adding
 * a new env var for a single-use endpoint.
 *
 * Runs inside Vercel's runtime deliberately — POSTGRES_URL is a
 * "Sensitive" env var, which Vercel only resolves inside the deployed
 * runtime, not via `vercel env pull` to a local machine.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { seedDatabase } = await import("@/scripts/seed-db");
  const result = await seedDatabase();

  return NextResponse.json({ ok: true, ...result });
}
