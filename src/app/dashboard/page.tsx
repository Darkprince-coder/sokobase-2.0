import { Package, FileEdit, MessageCircle, Eye, Store } from "lucide-react";
import { requireBusiness } from "@/lib/auth";
import { getPlanUsage, getOrderClicks30 } from "@/lib/dashboard";
import { formatDate } from "@/lib/dates";
import { site } from "@/lib/site";
import UsageBar from "@/components/dashboard/UsageBar";
import Button from "@/components/Button";
import AuthCard from "@/components/AuthCard";
import styles from "@/components/dashboard/dash.module.css";

export default async function DashboardOverview() {
  const { supabase, business } = await requireBusiness();

  if (!business) {
    return (
      <AuthCard title="No shop linked yet" text="Your account is not linked to a business. Contact SokoBase on WhatsApp to get set up.">
        {site.supportWhatsapp && <Button href={`https://wa.me/${site.supportWhatsapp}`} external>Message SokoBase</Button>}
      </AuthCard>
    );
  }

  const [usage, { count: published }, clicks30] = await Promise.all([
    getPlanUsage(supabase, business.id),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("business_id", business.id).eq("status", "published"),
    getOrderClicks30(business.id),
  ]);

  return (
    <>
      <header className={styles.head}>
        <div><h1>{business.name}</h1><p className={styles.sub}>sokobase.co.ke/store/{business.slug}</p></div>
        <Button href={`${site.url}/store/${business.slug}`} external size="sm" variant="outline" icon={<Eye size={15} />}>View shop</Button>
      </header>

      <div className={styles.stats}>
        <div className={styles.stat}><span className={styles.statIcon}><Package size={18} /></span><div><div className={styles.statNum}>{published ?? 0}</div><div className={styles.statLabel}>Published</div></div></div>
        <div className={styles.stat}><span className={styles.statIcon}><FileEdit size={18} /></span><div><div className={styles.statNum}>{usage.count - (published ?? 0)}</div><div className={styles.statLabel}>Drafts</div></div></div>
        <div className={styles.stat}><span className={styles.statIcon}><MessageCircle size={18} /></span><div><div className={styles.statNum}>{clicks30}</div><div className={styles.statLabel}>WhatsApp orders, 30d</div></div></div>
      </div>

      <section className={styles.panel}>
        <h2>Plan usage</h2>
        <UsageBar count={usage.count} limit={usage.limit} />
        {usage.endsAt && <p className={styles.sub}>{usage.live ? "Active until" : "Expired on"} {formatDate(usage.endsAt)} &middot; {usage.planName} plan</p>}
      </section>

      <section className={styles.panel}>
        <h2>Quick links</h2>
        <div className={styles.btnRow}>
          <Button href="/dashboard/products/new" icon={<Package size={16} />}>Add a product</Button>
          <Button href="/dashboard/profile" variant="soft" icon={<Store size={16} />}>Edit shop profile</Button>
        </div>
      </section>
    </>
  );
}
