import { NextRequest, NextResponse } from "next/server";

// Vercel Hobby tier only allows daily-frequency cron schedules, so
// vercel.json triggers this route every day and it no-ops unless today
// is Mon/Wed/Fri (0=Sun ... 1=Mon, 3=Wed, 5=Fri). If the project is on
// Pro, this check can be removed and vercel.json's schedule changed to
// a literal "0 9 * * 1,3,5" instead.
const SCAN_DAYS_UTC = [1, 3, 5];

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const day = new Date().getUTCDay();
  if (!SCAN_DAYS_UTC.includes(day)) {
    return NextResponse.json({ skipped: true, reason: "not a scan day (UTC)" });
  }

  const { runScan } = await import("@/scripts/run-scan");
  const result = await runScan({ baseUrl: req.nextUrl.origin });

  return NextResponse.json({ ok: true, ranAt: new Date().toISOString(), ...result });
}
