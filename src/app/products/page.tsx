import type { Metadata } from "next";
import { PackageSearch } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import FilterBar from "@/components/FilterBar";
import { getProducts } from "@/lib/catalog";
import { categories } from "@/lib/categories";
import styles from "./products.module.css";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ q?: string; category?: string; badge?: string }> }): Promise<Metadata> {
  const sp = await searchParams;
  const cat = categories.find((c) => c.slug === sp.category);
  const title = sp.q ? `Search: ${sp.q}` : cat ? cat.label : sp.badge === "hot" ? "Hot deals" : sp.badge === "offer" ? "Offers" : sp.badge === "new" ? "New arrivals" : "All products";
  return { title, alternates: { canonical: "/products" } };
}

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string; badge?: string }> }) {
  const sp = await searchParams;
  const products = await getProducts({ q: sp.q, category: sp.category, badge: sp.badge, limit: 60 });
  const cat = categories.find((c) => c.slug === sp.category);
  const title = sp.q ? `Results for "${sp.q}"` : cat ? cat.label : sp.badge === "hot" ? "Hot deals" : sp.badge === "offer" ? "Offers" : sp.badge === "new" ? "New arrivals" : "All products";

  return (
    <div className={`container ${styles.wrap}`}>
      <h1 className={styles.title}>{title}</h1>
      <FilterBar category={sp.category} badge={sp.badge} />
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
