import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionCookie } from "@/lib/auth";

// HMAC verification uses Node's crypto module, so this middleware must run
// on the Node.js runtime rather than the default Edge runtime.
export const runtime = "nodejs";

export const config = {
  // api/cron is excluded because it's called by Vercel Cron with no session
  // cookie — it authenticates itself via the CRON_SECRET bearer token instead.
  matcher: ["/((?!api/auth|api/cron|login|_next/static|_next/image|favicon.ico|mascot|lemfi-logo.png).*)"],
};

export function middleware(req: NextRequest) {
  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  if (verifySessionCookie(cookie)) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}
