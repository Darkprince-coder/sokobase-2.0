import "server-only";
import { createHash } from "node:crypto";

// Anonymous, privacy-preserving visitor key for rate limiting and de-duplication: a salted hash of
// IP + user agent that changes every day. The raw IP/user agent is never stored.
export function visitorFingerprint(headers: Headers) {
  const ip = (headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || headers.get("x-real-ip") || "unknown";
  const ua = headers.get("user-agent") ?? "";
  const day = new Date().toISOString().slice(0, 10);
  const salt = process.env.ORDER_CLICK_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return createHash("sha256").update(`${salt}|${day}|${ip}|${ua}`).digest("hex").slice(0, 32);
}
