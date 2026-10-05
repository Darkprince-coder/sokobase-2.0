import "server-only";
import { headers } from "next/headers";

// Cloudflare Turnstile (free, privacy-friendly CAPTCHA). Off until both keys are set, so local
// development and the first deploy work without it.
export const turnstileEnabled = () => !!(process.env.TURNSTILE_SECRET_KEY && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);

export async function verifyTurnstile(token: FormDataEntryValue | null): Promise<boolean> {
  if (!turnstileEnabled()) return true;
  if (typeof token !== "string" || !token) return false;
  const body = new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY!, response: token });
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim();
  if (ip) body.set("remoteip", ip);
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body, cache: "no-store" });
    const json = (await res.json()) as { success?: boolean };
    return json.success === true;
  } catch {
    return false;
  }
}
