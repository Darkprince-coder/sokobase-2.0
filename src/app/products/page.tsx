import type { Metadata } from "next";
import { PackageSearch } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import FilterBar from "@/components/FilterBar";
import { getProducts, getSubcategories } from "@/lib/catalog";
import { createPublicClient } from "@/lib/supabase/public";
import styles from "./products.module.css";

async function categoryName(slug?: string) {
  if (!slug) return null;
  const { data } = await createPublicClient().from("categories").select("name").eq("slug", slug).maybeSingle();
  return data?.name ?? null;
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ q?: string; category?: string; badge?: string }> }): Promise<Metadata> {
  const sp = await searchParams;
  const catName = await categoryName(sp.category);
  const title = sp.q ? `Search: ${sp.q}` : catName ?? (sp.badge === "hot" ? "Hot deals" : sp.badge === "offer" ? "Offers" : sp.badge === "new" ? "New arrivals" : "All products");
  return { title, alternates: { canonical: "/products" } };
}

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string; subcategory?: string; badge?: string }> }) {
  const sp = await searchParams;
  const [products, subcategories, catName] = await Promise.all([
    getProducts({ q: sp.q, category: sp.category, subcategory: sp.subcategory, badge: sp.badge, limit: 60 }),
    sp.category ? getSubcategories(sp.category) : Promise.resolve([]),
    categoryName(sp.category),
  ]);
  const title = sp.q ? `Results for "${sp.q}"` : catName ?? (sp.badge === "hot" ? "Hot deals" : sp.badge === "offer" ? "Offers" : sp.badge === "new" ? "New arrivals" : "All products");

  return (
    <div className={`container ${styles.wrap}`}>
      <h1 className={styles.title}>{title}</h1>
      <FilterBar category={sp.category} subcategory={sp.subcategory} badge={sp.badge} subcategories={subcategories} />
      {products.length === 0 ? (
        <div className={styles.empty}>
          <PackageSearch size={40} strokeWidth={1.4} aria-hidden="true" />
          <p>No products found{sp.q ? ` for "${sp.q}"` : ""}. Try a different search or category.</p>
        </div>
      ) : (
        <div className={styles.grid}>{products.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}</div>
      )}
    </div>
  );
}
