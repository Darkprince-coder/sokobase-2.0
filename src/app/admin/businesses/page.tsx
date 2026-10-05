import type { Metadata } from "next";
import Link from "next/link";
import { adminDb } from "@/lib/admin";
import { categoryNames, one, type BusinessCategoriesRel, type Rel } from "@/lib/relations";
import { formatDate, isPast } from "@/lib/dates";
import StatusPill from "@/components/admin/StatusPill";
import Button from "@/components/Button";
import styles from "@/components/admin/admin.module.css";

export const metadata: Metadata = { title: "Businesses" };

const FILTERS = ["all", "active", "expired", "suspended"] as const;
type Filter = (typeof FILTERS)[number];

export default async function BusinessesPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const sp = await searchParams;
  const filter: Filter = (FILTERS as readonly string[]).includes(sp.status ?? "") ? (sp.status as Filter) : "all";
  const term = (sp.q ?? "").replace(/[%,()*\\]/g, "").trim().slice(0, 60);
  const { db } = await adminDb();

  let query = db.from("businesses").select("id, slug, name, location, status, created_at, products(count), counties(name), business_categories(categories(name))").order("created_at", { ascending: false }).limit(500);
  if (term) query = query.ilike("name", `%${term}%`);
  const [{ data: businesses }, { data: subs }] = await Promise.all([
    query,
    db.from("subscriptions").select("business_id, status, ends_at, plans(name, product_limit)").order("ends_at", { ascending: false }).limit(3000),
  ]);

  const latest = new Map<string, NonNullable<typeof subs>[number]>();
  for (const s of subs ?? []) if (!latest.has(s.business_id)) latest.set(s.business_id, s);

  type Row = { id: string; slug: string; name: string; location: string; status: string; created_at: string;
    products: Rel<{ count: number }>; counties: Rel<{ name: string }>; business_categories: BusinessCategoriesRel };
  const rows = ((businesses ?? []) as unknown as Row[]).map((b) => {
    const sub = latest.get(b.id);
    const live = !!sub && sub.status === "active" && !isPast(sub.ends_at);
    const state = b.status === "suspended" ? "suspended" : live ? "active" : "expired";
    const plan = one(sub?.plans);
    const cats = categoryNames(b.business_categories);
    return { b, sub, plan, state: state as "active" | "expired" | "suspended", count: one(b.products)?.count ?? 0, county: one(b.counties)?.name, cats };
  }).filter((r) => filter === "all" || r.state === filter);

  const link = (f: Filter) => `/admin/businesses?${new URLSearchParams({ ...(f !== "all" ? { status: f } : {}), ...(term ? { q: term } : {}) })}`;

  return (
    <>
      <header className={styles.head}><h1>Businesses</h1><p className={styles.sub}>Every shop on SokoBase. New shops appear here after they register with an invite.</p></header>
      <section className={styles.panel}>
        <div className={styles.filters}>
          {FILTERS.map((f) => <Link key={f} href={link(f)} className={`${styles.filter} ${f === filter ? styles.filterOn : ""}`}>{f[0].toUpperCase() + f.slice(1)}</Link>)}
          <form className={styles.search} action="/admin/businesses">
            {filter !== "all" && <input type="hidden" name="status" value={filter} />}
            <input className={styles.input} type="search" name="q" defaultValue={term} placeholder="Search by name" aria-label="Search businesses" />
            <Button type="submit" size="sm" variant="soft">Search</Button>
          </form>
        </div>
        {rows.length === 0 ? <p className={styles.empty}>No businesses match.</p> : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Business</th><th>County</th><th>Plan</th><th>Products</th><th>Expires</th><th>Status</th></tr></thead>
              <tbody>
                {rows.map(({ b, sub, plan, state, count, county, cats }) => (
                  <tr key={b.id}>
                    <td><Link href={`/admin/businesses/${b.id}`}>{b.name}</Link><div className={styles.muted} style={{ fontSize: 12 }}>{cats.length ? cats.join(", ") : "No category"}</div></td>
                    <td>{county ?? <span className={styles.muted}>-</span>}</td>
                    <td>{plan?.name ?? <span className={styles.muted}>None</span>}</td>
                    <td className={styles.mono}>{count}{plan?.product_limit ? ` / ${plan.product_limit}` : ""}</td>
                    <td>{sub ? formatDate(sub.ends_at) : <span className={styles.muted}>-</span>}</td>
                    <td><StatusPill kind={state} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
