import { type EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { RECOVERY_COOKIE, RECOVERY_MAX_AGE } from "@/lib/recovery";

// Landing point for links in Supabase auth emails (password reset). Supports both the token_hash
// link (works even if the email is opened on another device) and the PKCE ?code= link.
const ALLOWED_NEXT = new Set(["/reset-password", "/dashboard", "/admin"]);

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;
  const code = params.get("code");
  const nextParam = params.get("next") ?? "/dashboard";
  const next = ALLOWED_NEXT.has(nextParam) ? nextParam : "/dashboard"; // never an open redirect

  const supabase = await createClient();
  let ok = false;
  if (tokenHash && type) ok = !(await supabase.auth.verifyOtp({ type, token_hash: tokenHash })).error;
  else if (code) ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  if (!ok) redirect("/forgot-password?expired=1");

  if (next === "/reset-password") {
    (await cookies()).set(RECOVERY_COOKIE, "1", {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: RECOVERY_MAX_AGE, path: "/",
    });
  }
  redirect(next);
}
