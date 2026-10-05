import Link from "next/link";
import { BellRing } from "lucide-react";
import { adminDb } from "@/lib/admin";
import { one, type Rel } from "@/lib/relations";
import { daysLeft, formatDate, nowMs } from "@/lib/dates";
import { renewalReminderLink } from "@/lib/reminders";
import { GRACE_DAYS } from "@/lib/dashboard";
import styles from "@/components/admin/admin.module.css";

type SubRow = {
  business_id: string; ends_at: string;
  plans: Rel<{ name: string; price_kes: number }>; businesses: Rel<{ name: string; whatsapp: string; status: string }>;
};
type Latest = { endsAt: string; plan: string; price: number; name: string; whatsapp: string; status: string };

const kes = (n: number) => `KSh ${n.toLocaleString("en-KE")}`;
const monthKey = (iso: string) => iso.slice(0, 7);
const monthLabel = (key: string) => new Date(`${key}-01T12:00:00Z`).toLocaleDateString("en-KE", { month: "short", year: "numeric" });

export default async function AdminOverview() {
  const { db } = await adminDb();
  const now = nowMs();
  const since30 = new Date(now - 30 * 86400000).toISOString();
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setUTCMonth(sixMonthsAgo.getUTCMonth() - 5, 1);
  sixMonthsAgo.setUTCHours(0, 0, 0, 0);

  const [biz, prods, clicks, subs, recent, reports, payments] = await Promise.all([
    db.from("businesses").select("id", { count: "exact", head: true }),
    db.from("products").select("id", { count: "exact", head: true }).eq("status", "published"),
    db.from("order_clicks").select("id", { count: "exact", head: true }).gte("created_at", since30),
    // Periods that are live or ended in the last 30 days: enough to find expiring and recently lapsed shops.
    db.from("subscriptions").select("business_id, ends_at, plans(name, price_kes), businesses(name, whatsapp, status)")
      .eq("status", "active").gt("ends_at", since30).limit(3000),
    db.from("businesses").select("id, name, location, created_at").order("created_at", { ascending: false }).limit(5),
    db.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    db.from("subscriptions").select("amount_kes, created_at").neq("status", "cancelled").gte("created_at", sixMonthsAgo.toISOString()).limit(5000),
  ]);

  // Latest end date per business, so a queued renewal does not show as "expiring".
  const latest = new Map<string, Latest>();
  for (const s of (subs.data ?? []) as unknown as SubRow[]) {
    const cur = latest.get(s.business_id);
    if (!cur || s.ends_at > cur.endsAt) {
      const plan = one(s.plans);
      const b = one(s.businesses);
      latest.set(s.business_id, { endsAt: s.ends_at, plan: plan?.name ?? "", price: plan?.price_kes ?? 0, name: b?.name ?? "", whatsapp: b?.whatsapp ?? "", status: b?.status ?? "active" });
    }
  }
  const all = [...latest.entries()].filter(([, v]) => v.status === "active").sort((a, b) => a[1].endsAt.localeCompare(b[1].endsAt));
  const live = all.filter(([, v]) => daysLeft(v.endsAt) > 0);
  const expiring = live.filter(([, v]) => daysLeft(v.endsAt) <= 7);
  const lapsed = all.filter(([, v]) => daysLeft(v.endsAt) <= 0).reverse();

  // Payments by month (amount actually paid; see migration 0009).
  const byMonth = new Map<string, { total: number; count: number }>();
  for (let i = 0; i < 6; i++) {
    const d = new Date(sixMonthsAgo);
    d.setUTCMonth(d.getUTCMonth() + i);
    byMonth.set(monthKey(d.toISOString()), { total: 0, count: 0 });
  }
  for (const p of payments.data ?? []) {
    const m = byMonth.get(monthKey(p.created_at));
    if (m) { m.total += p.amount_kes ?? 0; m.count += 1; }
  }
  const months = [...byMonth.entries()].reverse();
  const thisMonth = months[0]?.[1] ?? { total: 0, count: 0 };

  const remind = (v: Latest) => renewalReminderLink({ whatsapp: v.whatsapp, shopName: v.name, planName: v.plan, priceKes: v.price, endsAt: v.endsAt });

  return (
    <>
      <header className={styles.head}><h1>Overview</h1><p className={styles.sub}>How the platform is doing right now.</p></header>
      <div className={styles.stats}>
        <div className={styles.stat}><div className={styles.statNum}>{live.length}</div><div className={styles.statLabel}>Live shops (of {biz.count ?? 0})</div></div>
        <div className={styles.stat}><div className={styles.statNum}>{kes(thisMonth.total)}</div><div className={styles.statLabel}>Payments this month ({thisMonth.count})</div></div>
        <div className={styles.stat}><div className={styles.statNum}>{clicks.count ?? 0}</div><div className={styles.statLabel}>WhatsApp orders, 30 days</div></div>
        <div className={styles.stat}><div className={styles.statNum}>{prods.count ?? 0}</div><div className={styles.statLabel}>Live products</div></div>
        <Link href="/admin/reports" className={styles.stat} style={{ textDecoration: "none" }}>
          <div className={styles.statNum} style={(reports.count ?? 0) > 0 ? { color: "var(--color-danger)" } : undefined}>{reports.count ?? 0}</div>
          <div className={styles.statLabel}>Open reports</div>
        </Link>
      </div>

      <div className={styles.two}>
        <section className={styles.panel}>
          <h2>Expiring within 7 days</h2>
          {expiring.length === 0 ? <p className={styles.empty}>Nothing expiring soon.</p> : (
            <ul className={styles.list}>
              {expiring.map(([id, v]) => (
                <li key={id} className={styles.listItem}>
                  <span><Link href={`/admin/businesses/${id}`}><strong>{v.name}</strong></Link><br /><span className={styles.muted}>{v.plan}, ends {formatDate(v.endsAt)} ({daysLeft(v.endsAt)}d)</span></span>
                  <a className={styles.remind} href={remind(v)} target="_blank" rel="noopener noreferrer"><BellRing size={14} aria-hidden="true" /> Remind</a>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className={styles.panel}>
          <h2>Lapsed in the last 30 days</h2>
          {lapsed.length === 0 ? <p className={styles.empty}>No lapsed shops.</p> : (
            <ul className={styles.list}>
              {lapsed.map(([id, v]) => {
                const hidden = -daysLeft(v.endsAt) >= GRACE_DAYS;
                return (
                  <li key={id} className={styles.listItem}>
                    <span><Link href={`/admin/businesses/${id}`}><strong>{v.name}</strong></Link><br /><span className={styles.muted}>Ended {formatDate(v.endsAt)} · {hidden ? "hidden from customers" : "in grace period"}</span></span>
                    <a className={styles.remind} href={remind(v)} target="_blank" rel="noopener noreferrer"><BellRing size={14} aria-hidden="true" /> Remind</a>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <div className={styles.two}>
        <section className={styles.panel}>
          <h2>Payments by month</h2>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Month</th><th>Payments</th><th>Total</th></tr></thead>
              <tbody>
                {months.map(([key, m]) => (
                  <tr key={key}><td>{monthLabel(key)}</td><td className={styles.mono}>{m.count}</td><td className={styles.mono}>{kes(m.total)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={styles.hint} style={{ marginTop: 8 }}>Counted by the date a payment was recorded (renewals and new shops), excluding cancelled periods.</p>
        </section>
        <section className={styles.panel}>
          <h2>Newest businesses</h2>
          {(recent.data ?? []).length === 0 ? <p className={styles.empty}>No businesses yet. Create an invite to onboard the first one.</p> : (
            <ul className={styles.list}>
              {recent.data!.map((b) => (
                <li key={b.id} className={styles.listItem}>
                  <Link href={`/admin/businesses/${b.id}`}><strong>{b.name}</strong></Link>
                  <span className={styles.muted}>{b.location}, {formatDate(b.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
