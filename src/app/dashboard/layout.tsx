import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import Logo from "@/components/Logo";
import DashNav from "@/components/dashboard/DashNav";
import DashTabBar from "@/components/dashboard/DashTabBar";
import { requireBusiness } from "@/lib/auth";
import { getPlanUsage } from "@/lib/dashboard";
import { daysLeft, formatDate, isPast } from "@/lib/dates";
import { site, whatsappLink } from "@/lib/site";
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
          {business ? <a href={`${site.url}/store/${business.slug}`} target="_blank" rel="noopener noreferrer">View my shop</a> : <a href={site.url}>View site</a>}
          <form action={signOut}><button type="submit">Sign out</button></form>
        </div>
      </aside>
      <div className={styles.content}>
        {business && usage && banner(usage, business.name)}
        {children}
      </div>
      {business && <DashTabBar />}
    </div>
  );
}

type Usage = Awaited<ReturnType<typeof getPlanUsage>>;

// Expiry warnings: before the end date, during the grace period (shop still public), and after it (hidden).
function banner(usage: Usage, shopName: string) {
  if (!usage.endsAt || !usage.graceEndsAt) return null;
  const renew = site.supportWhatsapp ? whatsappLink(site.supportWhatsapp, `Hi SokoBase, I'd like to renew the ${usage.planName ?? ""} plan for ${shopName}.`) : null;
  const renewLink = renew ? <> <a href={renew} target="_blank" rel="noopener noreferrer">Renew on WhatsApp</a>.</> : " Contact SokoBase to renew.";
  const plural = (n: number) => `${n} day${n === 1 ? "" : "s"}`;

  let text: React.ReactNode = null;
  if (usage.live) {
    const left = daysLeft(usage.endsAt);
    if (left > 5) return null;
    text = <><strong>Your plan expires {formatDate(usage.endsAt)}</strong> ({plural(left)} left).{renewLink}</>;
  } else if (!isPast(usage.graceEndsAt)) {
    text = <><strong>Your plan ended on {formatDate(usage.endsAt)}.</strong> Customers can still see your shop for {plural(daysLeft(usage.graceEndsAt))}, but you can&apos;t make changes.{renewLink}</>;
  } else {
    text = <><strong>Your shop is hidden from customers.</strong> Your plan ended on {formatDate(usage.endsAt)}. Your products are saved and come back as soon as you renew.{renewLink}</>;
  }
  return (
    <div className={styles.warnBanner} role="status">
      <AlertTriangle size={18} aria-hidden="true" />
      <span>{text}</span>
    </div>
  );
}
