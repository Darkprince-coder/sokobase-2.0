import type { Metadata } from "next";
import { Plus, Package } from "lucide-react";
import { requireBusiness } from "@/lib/auth";
import { getPlanUsage } from "@/lib/dashboard";
import UsageBar from "@/components/dashboard/UsageBar";
import ProductList, { type DashProduct } from "@/components/dashboard/ProductList";
import Button from "@/components/Button";
import styles from "@/components/dashboard/dash.module.css";

export const metadata: Metadata = { title: "Products" };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { supabase, business } = await requireBusiness();
  if (!business) return null;
  const { error } = await searchParams;

  const [usage, { data }] = await Promise.all([
    getPlanUsage(supabase, business.id),
    supabase.from("products").select("id, name, price, price_type, status, in_stock, images").eq("business_id", business.id).order("created_at", { ascending: false }),
  ]);
  const products: DashProduct[] = (data ?? []).map((p) => ({ ...p, price: p.price == null ? null : Number(p.price) }));
  const remaining = usage.limit === null ? null : usage.limit - usage.count;
  const atLimit = remaining !== null && remaining <= 0;

  return (
    <>
      <header className={styles.head}>
        <div><h1>Products</h1><p className={styles.sub}>Manage what shows on your storefront. Tap a status to change it.</p></div>
        {!atLimit && <Button href="/dashboard/products/new" icon={<Plus size={16} />}>Add product</Button>}
      </header>

      {error && <p className={styles.msgErr} role="alert" style={{ marginBottom: 14 }}>{error.slice(0, 200)}</p>}
      <UsageBar count={usage.count} limit={usage.limit} />
      {remaining !== null && remaining <= 3 && remaining > 0 && (
        <p className={styles.sub} style={{ marginTop: -12, marginBottom: 16 }}>Only {remaining} product slot{remaining === 1 ? "" : "s"} left on your plan.</p>
      )}
      {atLimit && (
        <p className={styles.sub} style={{ marginTop: -12, marginBottom: 16 }}>You have reached your plan limit. Delete a product or ask SokoBase to upgrade your plan to add more.</p>
      )}

      {products.length === 0 ? (
        <div className={styles.panel} style={{ textAlign: "center", padding: "40px 20px" }}>
          <Package size={32} strokeWidth={1.4} style={{ margin: "0 auto 10px", color: "var(--ink-3)" }} />
          <p className={styles.empty} style={{ marginBottom: 14 }}>No products yet. Add your first one to start selling.</p>
          <Button href="/dashboard/products/new" icon={<Plus size={16} />}>Add your first product</Button>
        </div>
      ) : (
        <ProductList products={products} />
      )}
    </>
  );
}
