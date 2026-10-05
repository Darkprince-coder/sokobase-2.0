"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { verifyTurnstile } from "@/lib/turnstile";
import { site } from "@/lib/site";
import { RECOVERY_COOKIE } from "@/lib/recovery";

export type LoginState = { error?: string; message?: string; attempt?: number };

export async function login(prev: LoginState, formData: FormData): Promise<LoginState> {
  const attempt = (prev.attempt ?? 0) + 1;
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password.", attempt };
  if (!(await verifyTurnstile(formData.get("cf-turnstile-response")))) return { error: "Please complete the security check and try again.", attempt };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    if (error?.status === 429) return { error: "Too many sign-in attempts. Wait a few minutes and try again.", attempt };
    return { error: "Incorrect email or password.", attempt };
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  redirect(profile?.role === "super_admin" ? "/admin" : "/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// ---------- Forgot / reset password ----------
const emailSchema = z.string().trim().toLowerCase().email();
const SENT = "If an account exists for that email, a reset link is on its way. Check your inbox (and spam folder).";

export async function requestPasswordReset(prev: LoginState, formData: FormData): Promise<LoginState> {
  const attempt = (prev.attempt ?? 0) + 1;
  const email = emailSchema.safeParse(formData.get("email"));
  if (!email.success) return { error: "Enter a valid email address.", attempt };
  if (!(await verifyTurnstile(formData.get("cf-turnstile-response")))) return { error: "Please complete the security check and try again.", attempt };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email.data, { redirectTo: `${site.portalUrl}/auth/confirm?next=/reset-password` });
  // Same answer whether or not the account exists, so this can't be used to discover emails.
  if (error?.status === 429) return { error: "Too many requests. Wait a few minutes and try again.", attempt };
  return { message: SENT, attempt };
}

const resetSchema = z
  .object({ password: z.string().min(10, "Use at least 10 characters").max(72), confirm_password: z.string() })
  .refine((v) => v.password === v.confirm_password, { message: "Passwords do not match.", path: ["confirm_password"] });

export async function resetPassword(prev: LoginState, formData: FormData): Promise<LoginState> {
  const attempt = (prev.attempt ?? 0) + 1;
  const jar = await cookies();
  if (!jar.get(RECOVERY_COOKIE)) return { error: "This reset link has expired. Request a new one.", attempt };
  const parsed = resetSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form.", attempt };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "This reset link has expired. Request a new one.", attempt };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") return { error: "Choose a password different from your old one.", attempt };
    if (error.code === "weak_password") return { error: "That password is too easy to guess. Try a longer one.", attempt };
    return { error: "Could not update your password. Request a new link and try again.", attempt };
  }
  // Anyone else signed in to this account (e.g. on a lost phone) is signed out.
  await supabase.auth.signOut({ scope: "others" });
  jar.delete(RECOVERY_COOKIE);

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  redirect(profile?.role === "super_admin" ? "/admin" : "/dashboard");
}
