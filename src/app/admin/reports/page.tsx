import type { Metadata } from "next";
import Link from "next/link";
import { adminDb } from "@/lib/admin";
import { one, type Rel } from "@/lib/relations";
import { formatDate } from "@/lib/dates";
import { site } from "@/lib/site";
import { REPORT_REASONS } from "@/lib/admin-labels";
import { moderateProduct, resolveReport } from "@/app/admin/actions";
import StatusPill from "@/components/admin/StatusPill";
import Button from "@/components/Button";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import styles from "@/components/admin/admin.module.css";

export const metadata: Metadata = { title: "Reports" };

const FILTERS = ["open", "resolved", "dismissed", "all"] as const;
type Filter = (typeof FILTERS)[number];
type Row = {
  id: string; reason: keyof typeof REPORT_REASONS; details: string | null; contact: string | null; status: "open" | "resolved" | "dismissed"; created_at: string;
  business_id: string; product_id: string | null;
  businesses: Rel<{ name: string; slug: string }>; products: Rel<{ name: string; slug: string; status: string }>;
};

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const sp = await searchParams;
  const filter: Filter = (FILTERS as readonly string[]).includes(sp.status ?? "") ? (sp.status as Filter) : "open";
  const { db } = await adminDb();
  let query = db.from("reports")
    .select("id, reason, details, contact, status, created_at, business_id, product_id, businesses(name, slug), products(name, slug, status)")
    .order("created_at", { ascending: false }).limit(200);
  if (filter !== "all") query = query.eq("status", filter);
  const { data } = await query;
  const rows = (data ?? []) as unknown as Row[];

  return (
    <>
      <header className={styles.head}>
        <h1>Reports</h1>
        <p className={styles.sub}>Listings flagged by customers. Check the listing, message the shop if needed, then resolve or dismiss.</p>
      </header>
      <section className={styles.panel}>
        <div className={styles.filters}>
          {FILTERS.map((f) => (
            <Link key={f} href={f === "open" ? "/admin/reports" : `/admin/reports?status=${f}`} className={`${styles.filter} ${f === filter ? styles.filterOn : ""}`}>
              {f[0].toUpperCase() + f.slice(1)}
            </Link>
          ))}
        </div>
        {rows.length === 0 ? <p className={styles.empty}>{filter === "open" ? "No open reports. Nice." : "Nothing here."}</p> : (
          <ul className={styles.list}>
            {rows.map((r) => {
              const biz = one(r.businesses);
              const product = one(r.products);
              return (
                <li key={r.id} className={styles.listItem}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <strong>{REPORT_REASONS[r.reason] ?? r.reason}</strong>
                    <div style={{ fontSize: 13.5, marginTop: 2 }}>
                      <Link href={`/admin/businesses/${r.business_id}`}>{biz?.name ?? "Deleted shop"}</Link>
                      {r.product_id && (
                        <> · {product ? (product.status === "published"
                          ? <a href={`${site.url}/products/${product.slug}`} target="_blank" rel="noopener noreferrer">{product.name}</a>
                          : <span>{product.name} <span className={styles.muted}>(hidden)</span></span>) : <span className={styles.muted}>Deleted product</span>}</>
                      )}
                    </div>
                    <div className={styles.muted} style={{ fontSize: 12.5 }}>{formatDate(r.created_at)}{r.contact ? ` · Reporter contact: ${r.contact}` : ""}</div>
                    {r.details && <p style={{ marginTop: 6 }}>{r.details}</p>}
                  </div>
                  <div className={styles.rowActions}>
                    <StatusPill kind={r.status} />
                    {r.product_id && product?.status === "published" && (
                      <form action={moderateProduct}>
                        <input type="hidden" name="id" value={r.product_id} />
                        <input type="hidden" name="status" value="draft" />
                        <ConfirmSubmit label="Unpublish product" question="Hide this product?" confirmLabel="Hide" />
                      </form>
                    )}
                    {r.status === "open" ? (
                      <>
                        <form action={resolveReport}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="status" value="resolved" /><Button type="submit" size="sm" variant="soft">Resolved</Button></form>
                        <form action={resolveReport}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="status" value="dismissed" /><Button type="submit" size="sm" variant="outline">Dismiss</Button></form>
                      </>
                    ) : (
                      <form action={resolveReport}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="status" value="open" /><Button type="submit" size="sm" variant="ghost">Reopen</Button></form>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
