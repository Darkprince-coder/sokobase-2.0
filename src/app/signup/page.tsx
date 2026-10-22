import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Check, ChevronRight } from "lucide-react";
import AuthCard from "@/components/AuthCard";
import RegisterForm from "@/components/RegisterForm";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth";
import { formatKes } from "@/lib/format";
import { portalAppMetadata, portalViewport } from "@/lib/portal-app";
import styles from "@/components/AuthCard.module.css";

export const metadata: Metadata = { ...portalAppMetadata, title: "Start selling", robots: { index: false, follow: false } };
export const viewport = portalViewport;

type Plan = { slug: string; name: string; price_kes: number; duration_days: number; product_limit: number | null };

// Open sign-up, linked from the public Sell page. Step 1: choose a plan (required). Step 2: the
// shop form. The shop is reviewed by SokoBase before customers can see it.
export default async function SignupPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const { user } = await getSessionUser();
  if (user) redirect("/dashboard");

  const planSlug = ((await searchParams).plan ?? "").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40);
  const db = createAdminClient();
  const { data: plansData } = await db.from("plans").select("slug, name, price_kes, duration_days, product_limit").eq("active", true).order("sort_order");
  const plans = (plansData ?? []) as Plan[];
  const plan = plans.find((p) => p.slug === planSlug);

  if (!plan) {
    return (
      <AuthCard title="Choose your plan" text="Step 1 of 2. Pick the plan that fits your shop. We confirm it with you when we approve your shop.">
        <ul className={styles.planList}>
          {plans.map((p) => (
            <li key={p.slug}>
              <Link href={`/signup?plan=${encodeURIComponent(p.slug)}`} className={styles.planOption}>
                <span className={styles.planText}>
                  <strong>{p.name}</strong>
                  <span className={styles.planPrice}>{p.price_kes > 0 ? `${formatKes(p.price_kes)} / ${p.duration_days} days` : "Ask us"}</span>
                  <span className={styles.planMeta}><Check size={14} aria-hidden="true" />{p.product_limit ? `Up to ${p.product_limit} products` : "Unlimited products"}</span>
                </span>
                <ChevronRight size={20} aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
        <p className={styles.meta} style={{ display: "block", textAlign: "center" }}>Already have a shop? <Link href="/login">Sign in</Link></p>
      </AuthCard>
    );
  }

  const [{ data: categories }, { data: counties }] = await Promise.all([
    db.from("categories").select("id, name").eq("active", true).order("sort_order"),
    db.from("counties").select("id, name").order("sort_order"),
  ]);

  return (
    <AuthCard
      title="Create your shop"
      text="Step 2 of 2. This takes about two minutes, and you can start adding products straight away. SokoBase checks every new shop before customers can see it, usually within a day."
    >
      <div className={styles.chosenPlan}>
        <span>Plan: <strong>{plan.name}</strong>{plan.price_kes > 0 ? ` · ${formatKes(plan.price_kes)} / ${plan.duration_days} days` : ""}</span>
        <Link href="/signup">Change</Link>
      </div>
      <RegisterForm plan={plan.slug} categories={categories ?? []} counties={counties ?? []} />
      <p className={styles.meta} style={{ display: "block", textAlign: "center" }}>Already have a shop? <Link href="/login">Sign in</Link></p>
    </AuthCard>
  );
}
