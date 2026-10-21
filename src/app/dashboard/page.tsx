import Link from "next/link";
import { BarChart3, CheckCircle2, ChevronRight, Package, FileEdit, MessageCircle, Store } from "lucide-react";
import { requireBusiness } from "@/lib/auth";
import { getPlanUsage, getOrderClicks30, shopVisibility } from "@/lib/dashboard";
import { getInsights } from "@/lib/insights";
import ViewShopLink from "@/components/dashboard/ViewShopLink";
import InstallBizApp from "@/components/dashboard/InstallBizApp";
import { formatDate } from "@/lib/dates";
import { site, whatsappLink } from "@/lib/site";
import UsageBar from "@/components/dashboard/UsageBar";
import ShareKit from "@/components/dashboard/ShareKit";
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

  const [usage, { count: published }, clicks30, { data: profile }, { count: withPhotos }, week] = await Promise.all([
    getPlanUsage(supabase, business.id),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("business_id", business.id).eq("status", "published"),
    getOrderClicks30(business.id),
    supabase.from("businesses").select("description, logo_url, cover_url").eq("id", business.id).maybeSingle(),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("business_id", business.id).eq("status", "published").neq("images", "{}"),
    getInsights(business.id, 7),
  ]);
  const weekViews = week.now.shopViews + week.now.productViews;
  const shopUrl = `${site.url}/store/${business.slug}`;

  // Getting-started checklist: shown until every step is done.
  const steps = [
    { done: !!profile?.logo_url, label: "Upload your logo", href: "/dashboard/profile" },
    { done: (profile?.description ?? "").trim().length >= 40, label: "Describe your shop (what you sell, delivery, opening hours)", href: "/dashboard/profile" },
    { done: !!profile?.cover_url, label: "Add a cover photo", href: "/dashboard/profile" },
    { done: (published ?? 0) >= 1, label: "Publish your first product", href: "/dashboard/products/new" },
    { done: (withPhotos ?? 0) >= 5, label: "Publish 5 products with photos", href: "/dashboard/products/new" },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const visibility = shopVisibility(business.status, usage);
  const contact = site.supportWhatsapp
    ? whatsappLink(site.supportWhatsapp, visibility === "expired" ? `Hi SokoBase, I'd like to renew the ${usage.planName ?? ""} plan for ${business.name}.` : visibility === "pending" ? `Hi SokoBase, I've signed up my shop ${business.name} and it's waiting for approval.` : `Hi SokoBase, I need help with my shop ${business.name}.`)
    : null;

  return (
    <>
      <header className={styles.head}>
        <div><h1>{business.name}</h1><p className={styles.sub}>{shopUrl.replace(/^https?:\/\//, "")}</p></div>
        <ViewShopLink asButton href={shopUrl} visibility={visibility} endedOn={usage.endsAt ? formatDate(usage.endsAt) : null} renewHref={contact} />
      </header>

      <InstallBizApp />

      <Link href="/dashboard/insights" className={styles.insightCard}>
        <BarChart3 size={20} aria-hidden="true" />
        <span><strong>This week:</strong> {weekViews.toLocaleString("en-KE")} visit{weekViews === 1 ? "" : "s"} · {week.now.clicks.toLocaleString("en-KE")} WhatsApp order tap{week.now.clicks === 1 ? "" : "s"}</span>
        <span className={styles.insightMore}>See insights <ChevronRight size={16} aria-hidden="true" /></span>
      </Link>

      <div className={styles.stats}>
        <div className={styles.stat}><span className={styles.statIcon}><Package size={18} /></span><div><div className={styles.statNum}>{published ?? 0}</div><div className={styles.statLabel}>Published</div></div></div>
        <div className={styles.stat}><span className={styles.statIcon}><FileEdit size={18} /></span><div><div className={styles.statNum}>{usage.count - (published ?? 0)}</div><div className={styles.statLabel}>Drafts</div></div></div>
        <div className={styles.stat}><span className={styles.statIcon}><MessageCircle size={18} /></span><div><div className={styles.statNum}>{clicks30}</div><div className={styles.statLabel}>WhatsApp orders, 30d</div></div></div>
      </div>

      {doneCount < steps.length && (
        <section className={styles.panel}>
          <h2>Get your shop ready</h2>
          <p className={styles.sub}>{doneCount} of {steps.length} done. Shops with a logo, description and photos get far more orders.</p>
          <div className={styles.progress} aria-hidden="true"><span style={{ width: `${(doneCount / steps.length) * 100}%` }} /></div>
          <ul className={styles.checklist}>
            {steps.map((s) => (
              <li key={s.label}>
                {s.done ? (
                  <span className={`${styles.checkItem} ${styles.checkDone}`}><CheckCircle2 size={20} className={styles.checkIcon} aria-hidden="true" /><span>{s.label}</span><span className="visually-hidden"> (done)</span></span>
                ) : (
                  <Link href={s.href} className={styles.checkItem}><span className={styles.checkTodo} aria-hidden="true" /><span>{s.label}</span></Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={styles.panel}>
        <h2>Share your shop</h2>
        <p className={styles.sub} style={{ marginBottom: 12 }}>One link for all your marketing: WhatsApp status, Instagram and TikTok bio, Facebook and flyers.</p>
        <ShareKit url={shopUrl} shopName={business.name} />
      </section>

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
