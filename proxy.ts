import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionCookie } from "@/lib/auth";

// Proxy always runs on the Node.js runtime (unlike the old Edge-only
// middleware convention), so HMAC verification via Node's crypto module
// just works here with no extra config.
export const config = {
  // api/cron is excluded because it's called by Vercel Cron with no session
  // cookie — it authenticates itself via the CRON_SECRET bearer token instead.
  matcher: ["/((?!api/auth|api/cron|login|_next/static|_next/image|favicon.ico|mascot|lemfi-logo.png).*)"],
};

export function proxy(req: NextRequest) {
  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  if (verifySessionCookie(cookie)) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}
