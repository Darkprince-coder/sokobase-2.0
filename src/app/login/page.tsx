import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AuthCard from "@/components/AuthCard";
import LoginForm from "@/components/LoginForm";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };

export default async function LoginPage() {
  const { user } = await getSessionUser();
  if (user) redirect("/dashboard");
  return (
    <AuthCard title="Business sign in" text="Sign in to manage your SokoBase shop. Accounts are created from an invite link.">
      <LoginForm />
    </AuthCard>
  );
}
