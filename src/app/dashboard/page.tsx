import type { Metadata } from "next";
import AuthCard from "@/components/AuthCard";
import Button from "@/components/Button";
import { requireBusiness } from "@/lib/auth";
import { signOut } from "@/app/login/actions";
import styles from "@/components/AuthCard.module.css";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false, follow: false } };

// Placeholder. Session 5 builds the real business dashboard (profile, products, subscription).
export default async function DashboardHome() {
  const { supabase, user, business } = await requireBusiness();

  let planLine = "No active subscription";
  if (business) {
    const { data: sub } = await supabase
      .from("subscriptions").select("plan_id, ends_at, status")
      .eq("business_id", business.id).order("ends_at", { ascending: false }).limit(1).maybeSingle();
    if (sub) {
      const { data: plan } = await supabase.from("plans").select("name").eq("id", sub.plan_id).maybeSingle();
      const live = sub.status === "active" && new Date(sub.ends_at) > new Date();
      planLine = `${plan?.name ?? "Plan"}, ${live ? "active until" : "expired on"} ${new Date(sub.ends_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}`;
    }
  }

  return (
    <AuthCard title={business ? business.name : "Dashboard"} text={business ? undefined : "Your account is not linked to a business yet. Contact SokoBase on WhatsApp."}>
      <div className={styles.meta}>
        <p>Account: <strong>{user.email}</strong></p>
        {business && <p>Shop link: <strong>sokobase.co.ke/store/{business.slug}</strong></p>}
        {business && <p>Status: <strong>{business.status}</strong></p>}
        {business && <p>Plan: <strong>{planLine}</strong></p>}
      </div>
      <form action={signOut}><Button type="submit" variant="outline">Sign out</Button></form>
    </AuthCard>
  );
}
