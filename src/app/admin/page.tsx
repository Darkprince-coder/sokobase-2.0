import type { Metadata } from "next";
import AuthCard from "@/components/AuthCard";
import Button from "@/components/Button";
import { requireSuperAdmin } from "@/lib/auth";
import { signOut } from "@/app/login/actions";
import styles from "@/components/AuthCard.module.css";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

// Placeholder. Session 3 builds the real super admin (businesses, plans, invites, hero slides, categories).
export default async function AdminHome() {
  const { user } = await requireSuperAdmin();
  return (
    <AuthCard title="Super admin" text="Signed in with super admin access. The admin dashboard arrives in Session 3.">
      <p className={styles.meta}>Account: <strong>{user.email}</strong></p>
      <form action={signOut}><Button type="submit" variant="outline">Sign out</Button></form>
    </AuthCard>
  );
}
