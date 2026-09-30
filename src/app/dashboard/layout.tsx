import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import Logo from "@/components/Logo";
import DashNav from "@/components/dashboard/DashNav";
import { requireBusiness } from "@/lib/auth";
import { getPlanUsage } from "@/lib/dashboard";
import { daysLeft, formatDate } from "@/lib/dates";
import { signOut } from "@/app/login/actions";
import styles from "@/components/dashboard/dash.module.css";

export const metadata: Metadata = { title: { default: "Dashboard", template: "%s | Dashboard" }, robots: { index: false, follow: false } };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { supabase, business } = await requireBusiness();
  const usage = business ? await getPlanUsage(supabase, business.id) : null;

  return (
    <div className={styles.shell}>
      <aside className={styles.side}>
        <div className={styles.brand}>
          <Logo size={30} tone="light" />
          {business && <span className={styles.brandName}>{business.name}</span>}
        </div>
        <DashNav />
        <div className={styles.sideFoot}>
          <Link href="/">View site</Link>
          <form action={signOut}><button type="submit">Sign out</button></form>
        </div>
      </aside>
      <div className={styles.content}>
        {business && usage && !usage.live && (
          <div className={styles.warnBanner}>
            <AlertTriangle size={18} aria-hidden="true" />
            <span><strong>Your subscription is not active.</strong> Your shop stays visible, but changes are disabled. Contact SokoBase to renew.</span>
          </div>
        )}
        {business && usage && usage.live && daysLeft(usage.endsAt!) <= 5 && (
          <div className={styles.warnBanner}>
            <AlertTriangle size={18} aria-hidden="true" />
            <span><strong>Your plan expires {formatDate(usage.endsAt!)}</strong> ({daysLeft(usage.endsAt!)} day{daysLeft(usage.endsAt!) === 1 ? "" : "s"} left). Contact SokoBase to renew and avoid interruption.</span>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
