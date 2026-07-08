import { NextRequest, NextResponse } from "next/server";

/**
 * Production DB setup/reseed, run manually. Lives under api/cron/ so it
 * inherits that path's proxy.ts exclusion (no session cookie needed) and
 * reuses CRON_SECRET rather than adding a new env var for a rarely-used
 * endpoint.
 *
 * Runs inside Vercel's runtime deliberately — POSTGRES_URL is a
 * "Sensitive" env var, which Vercel only resolves inside the deployed
 * runtime, not via `vercel env pull` to a local machine.
 *
 * By default this UPSERTS company data (safe to re-run after a CSV
 * update — relevance/tier/category refresh without touching scan
 * history). Pass ?reset=true to drop and recreate the tables first —
 * only needed for a structural schema change, deliberately NOT the
 * default so a routine re-trigger can never wipe accumulated data.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reset = req.nextUrl.searchParams.get("reset") === "true";

  const { seedDatabase } = await import("@/scripts/seed-db");
  const result = await seedDatabase({ reset });

  return NextResponse.json({ ok: true, reset, ...result });
}
