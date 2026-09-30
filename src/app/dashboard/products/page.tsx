import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Package } from "lucide-react";
import { requireBusiness } from "@/lib/auth";
import { getPlanUsage } from "@/lib/dashboard";
import { toggleProductStatus, toggleProductStock, deleteProduct } from "@/app/dashboard/actions";
import { formatKes } from "@/lib/format";
import UsageBar from "@/components/dashboard/UsageBar";
import Button from "@/components/Button";
import styles from "@/components/dashboard/dash.module.css";

export const metadata: Metadata = { title: "Products" };

export default async function ProductsPage() {
  const { supabase, business } = await requireBusiness();
  if (!business) return null;

  const [usage, { data: products }] = await Promise.all([
    getPlanUsage(supabase, business.id),
    supabase.from("products").select("id, name, price, price_type, status, in_stock, images, badge").eq("business_id", business.id).order("created_at", { ascending: false }),
  ]);
  const remaining = usage.limit === null ? null : usage.limit - usage.count;

  return (
    <>
      <header className={styles.head}>
        <div><h1>Products</h1><p className={styles.sub}>Manage what shows on your storefront.</p></div>
        <Button href="/dashboard/products/new" icon={<Plus size={16} />}>Add product</Button>
      </header>

      <UsageBar count={usage.count} limit={usage.limit} />
      {remaining !== null && remaining <= 3 && remaining > 0 && (
        <p className={styles.sub} style={{ marginTop: -12, marginBottom: 16 }}>Only {remaining} product slot{remaining === 1 ? "" : "s"} left on your plan.</p>
      )}

      {(products ?? []).length === 0 ? (
        <div className={styles.panel} style={{ textAlign: "center", padding: "40px 20px" }}>
          <Package size={32} strokeWidth={1.4} style={{ margin: "0 auto 10px", color: "var(--ink-3)" }} />
          <p className={styles.empty}>No products yet. Add your first one to start selling.</p>
        </div>
      ) : (
        <div className={styles.prodGrid}>
          {products!.map((p) => (
            <div key={p.id} className={styles.prodCard}>
              {p.images?.[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.images[0]} alt="" className={styles.prodThumb} />
              ) : <div className={styles.prodThumb} />}
              <div className={styles.prodInfo}>
                <Link href={`/dashboard/products/${p.id}/edit`}>{p.name}</Link>
                <span className={styles.prodPrice}>{p.price_type === "contact" ? "Contact for price" : `${p.price_type === "from" ? "From " : ""}${formatKes(Number(p.price))}`}</span>
                <div className={styles.prodMeta}>
                  <form action={toggleProductStock}>
                    <input type="hidden" name="id" value={p.id} /><input type="hidden" name="in_stock" value={String(p.in_stock)} />
                    <button type="submit" className={styles.pill} style={{ background: p.in_stock ? "var(--color-primary-tint)" : "var(--color-sage)", color: p.in_stock ? "var(--green-700)" : "var(--color-sold)" }}>
                      {p.in_stock ? "In stock" : "Out of stock"}
                    </button>
                  </form>
                  <form action={toggleProductStatus}>
                    <input type="hidden" name="id" value={p.id} /><input type="hidden" name="status" value={p.status} />
                    <button type="submit" className={styles.pill} style={{ background: p.status === "published" ? "var(--color-primary-tint)" : "var(--color-ochre-tint)", color: p.status === "published" ? "var(--green-700)" : "var(--color-ochre)" }}>
                      {p.status === "published" ? "Published" : "Draft"}
                    </button>
                  </form>
                </div>
              </div>
              <div className={styles.prodActions}>
                <Button href={`/dashboard/products/${p.id}/edit`} size="sm" variant="soft">Edit</Button>
                <form action={deleteProduct}><input type="hidden" name="id" value={p.id} /><Button type="submit" size="sm" variant="outline" className={styles.dangerBtn}>Delete</Button></form>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
