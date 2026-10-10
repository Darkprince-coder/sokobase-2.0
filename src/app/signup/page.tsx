import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import AuthCard from "@/components/AuthCard";
import RegisterForm from "@/components/RegisterForm";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth";
import { portalAppMetadata, portalViewport } from "@/lib/portal-app";
import styles from "@/components/AuthCard.module.css";

export const metadata: Metadata = { ...portalAppMetadata, title: "Start selling", robots: { index: false, follow: false } };
export const viewport = portalViewport;

// Open sign-up, linked from the public Sell page. No invite needed: the shop is reviewed by
// SokoBase before customers can see it.
export default async function SignupPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const { user } = await getSessionUser();
  if (user) redirect("/dashboard");

  const planSlug = ((await searchParams).plan ?? "").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40);
  const db = createAdminClient();
  const [{ data: categories }, { data: counties }, { data: plan }] = await Promise.all([
    db.from("categories").select("id, name").eq("active", true).order("sort_order"),
    db.from("counties").select("id, name").order("sort_order"),
    planSlug ? db.from("plans").select("slug, name").eq("slug", planSlug).eq("active", true).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  return (
    <AuthCard
      title="Start selling on SokoBase"
      text="Create your shop in about two minutes and start adding products straight away. SokoBase checks every new shop before customers can see it, usually within a day."
    >
      {plan && <p className={styles.meta} style={{ display: "block", marginBottom: -4 }}>Plan you chose: <strong>{plan.name}</strong>. We confirm it with you when we approve your shop.</p>}
      <RegisterForm plan={plan?.slug} categories={categories ?? []} counties={counties ?? []} />
      <p className={styles.meta} style={{ display: "block", textAlign: "center" }}>Already have a shop? <Link href="/login">Sign in</Link></p>
    </AuthCard>
  );
}
