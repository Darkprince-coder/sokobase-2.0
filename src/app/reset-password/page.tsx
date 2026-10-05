import type { Metadata } from "next";
import { cookies } from "next/headers";
import AuthCard from "@/components/AuthCard";
import Button from "@/components/Button";
import { ResetPasswordForm } from "@/components/PasswordResetForms";
import { getSessionUser } from "@/lib/auth";
import { RECOVERY_COOKIE } from "@/lib/recovery";

export const metadata: Metadata = { title: "Set a new password", robots: { index: false, follow: false } };

export default async function ResetPasswordPage() {
  const [{ user }, jar] = await Promise.all([getSessionUser(), cookies()]);
  if (!user || !jar.get(RECOVERY_COOKIE)) {
    return (
      <AuthCard title="Link expired" text="This password reset link has expired or was already used. Request a new one.">
        <Button href="/forgot-password" fullWidth>Request a new link</Button>
      </AuthCard>
    );
  }
  return (
    <AuthCard title="Set a new password" text={`For ${user.email}. Use at least 10 characters.`}>
      <ResetPasswordForm />
    </AuthCard>
  );
}
