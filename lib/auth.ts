import { createHmac, timingSafeEqual } from "crypto";

const SESSION_COOKIE = "lci_session";
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return secret;
}

export function signSessionCookie(): string {
  const payload = Date.now().toString();
  const sig = createHmac("sha256", getSecret()).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function verifySessionCookie(cookie: string | undefined | null): boolean {
  if (!cookie) return false;
  const [payload, sig] = cookie.split(".");
  if (!payload || !sig) return false;

  const expected = createHmac("sha256", getSecret()).update(payload).digest("hex");
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length) return false;
  if (!timingSafeEqual(sigBuf, expectedBuf)) return false;

  const age = Date.now() - Number(payload);
  return Number.isFinite(age) && age >= 0 && age < MAX_AGE_MS;
}

export { SESSION_COOKIE, MAX_AGE_MS };
