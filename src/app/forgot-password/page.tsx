import type { Metadata } from "next";
import AuthCard from "@/components/AuthCard";
import { ForgotPasswordForm } from "@/components/PasswordResetForms";

export const metadata: Metadata = { title: "Reset your password", robots: { index: false, follow: false } };

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ expired?: string }> }) {
  const { expired } = await searchParams;
  return (
    <AuthCard
      title="Reset your password"
      text={expired ? "That reset link has expired or was already used. Enter your email to get a new one." : "Enter the email you sign in with and we'll send you a link to set a new password."}
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
