import Link from "next/link";
import { adminDb } from "@/lib/admin";
import { one, type Rel } from "@/lib/relations";
import { daysLeft, formatDate, nowMs } from "@/lib/dates";
import styles from "@/components/admin/admin.module.css";

export default async function AdminOverview() {
  const { db } = await adminDb();
  const nowIso = new Date(nowMs()).toISOString();
  const since30 = new Date(nowMs() - 30 * 86400000).toISOString();

  const [biz, prods, clicks, live, recent] = await Promise.all([
    db.from("businesses").select("id", { count: "exact", head: true }),
    db.from("products").select("id", { count: "exact", head: true }),
    db.from("order_clicks").select("id", { count: "exact", head: true }).gte("created_at", since30),
    db.from("subscriptions").select("business_id, ends_at, plans(name), businesses(name)").eq("status", "active").gt("ends_at", nowIso).limit(2000),
    db.from("businesses").select("id, name, location, created_at").order("created_at", { ascending: false }).limit(5),
  ]);

  // Latest end date per business, so a queued renewal does not show as "expiring".
  const latest = new Map<string, { ends_at: string; plan: string; name: string }>();
  for (const s of live.data ?? []) {
    const cur = latest.get(s.business_id);
    if (!cur || s.ends_at > cur.ends_at) {
      const plan = one(s.plans as Rel<{ name: string }>)?.name;
      const name = one(s.businesses as Rel<{ name: string }>)?.name;
      latest.set(s.business_id, { ends_at: s.ends_at, plan: plan ?? "", name: name ?? "" });
    }
  }
  const expiring = [...latest.entries()].filter(([, v]) => daysLeft(v.ends_at) <= 7).sort((a, b) => a[1].ends_at.localeCompare(b[1].ends_at));

  return (
    <>
      <header className={styles.head}><h1>Overview</h1><p className={styles.sub}>How the platform is doing right now.</p></header>
      <div className={styles.stats}>
        <div className={styles.stat}><div className={styles.statNum}>{biz.count ?? 0}</div><div className={styles.statLabel}>Businesses</div></div>
        <div className={styles.stat}><div className={styles.statNum}>{latest.size}</div><div className={styles.statLabel}>Live subscriptions</div></div>
        <div className={styles.stat}><div className={styles.statNum}>{prods.count ?? 0}</div><div className={styles.statLabel}>Products</div></div>
        <div className={styles.stat}><div className={styles.statNum}>{clicks.count ?? 0}</div><div className={styles.statLabel}>WhatsApp orders, 30 days</div></div>
      </div>
      <div className={styles.two}>
        <section className={styles.panel}>
          <h2>Expiring within 7 days</h2>
          {expiring.length === 0 ? <p className={styles.empty}>Nothing expiring soon.</p> : (
            <ul>
              {expiring.map(([id, v]) => (
                <li key={id} className={styles.rowActions} style={{ justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
                  <Link href={`/admin/businesses/${id}`}><strong>{v.name}</strong></Link>
                  <span className={styles.muted}>{v.plan}, {formatDate(v.ends_at)} ({daysLeft(v.ends_at)}d)</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className={styles.panel}>
          <h2>Newest businesses</h2>
          {(recent.data ?? []).length === 0 ? <p className={styles.empty}>No businesses yet. Create an invite to onboard the first one.</p> : (
            <ul>
              {recent.data!.map((b) => (
                <li key={b.id} className={styles.rowActions} style={{ justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
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
