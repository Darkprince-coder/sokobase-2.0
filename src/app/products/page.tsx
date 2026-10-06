import type { Metadata } from "next";
import { PackageSearch } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import FilterBar from "@/components/FilterBar";
import ListingControls from "@/components/ListingControls";
import LoadMore from "@/components/LoadMore";
import ShopCard from "@/components/ShopCard";
import Button from "@/components/Button";
import Breadcrumbs, { type Crumb } from "@/components/Breadcrumbs";
import { getCounties, getSubcategories, searchProducts, searchShops, type ProductSort } from "@/lib/catalog";
import { createPublicClient } from "@/lib/supabase/public";
import styles from "./products.module.css";

const PAGE_SIZE = 24;
const MAX_PAGES = 20;
type Search = { q?: string; category?: string; subcategory?: string; badge?: string; county?: string; sort?: string; stock?: string; deals?: string; page?: string };

const SORTS: { value: ProductSort; label: string }[] = [
  { value: "relevance", label: "Best match" },
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "discount", label: "Biggest discount" },
];

async function categoryName(slug?: string) {
  if (!slug) return null;
  const { data } = await createPublicClient().from("categories").select("name").eq("slug", slug).maybeSingle();
  return data?.name ?? null;
}

const badgeTitle = (badge?: string) => (badge === "hot" ? "Hot deals" : badge === "offer" ? "Offers" : badge === "new" ? "New arrivals" : null);

export async function generateMetadata({ searchParams }: { searchParams: Promise<Search> }): Promise<Metadata> {
  const sp = await searchParams;
  const catName = await categoryName(sp.category);
  const title = sp.q ? `Search: ${sp.q}` : sp.deals === "1" ? "Top deals" : catName ?? badgeTitle(sp.badge) ?? "All products";
  // Category pages are indexable landing pages; search results and filtered/paged views are not.
  const indexable = !sp.q && !sp.county && !sp.sort && !sp.stock && !sp.page && !sp.subcategory && !sp.deals;
  return {
    title,
    description: catName ? `Shop ${catName.toLowerCase()} from verified businesses across Kenya and order directly on WhatsApp.` : undefined,
    alternates: { canonical: sp.category && indexable ? `/products?category=${sp.category}` : "/products" },
    robots: indexable ? undefined : { index: false, follow: true },
  };
}

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const q = sp.q?.trim().slice(0, 80) || undefined;
  const page = Math.min(Math.max(Number.parseInt(sp.page ?? "1", 10) || 1, 1), MAX_PAGES);
  const sort = SORTS.some((s) => s.value === sp.sort) ? (sp.sort as ProductSort) : undefined;
  const deals = sp.deals === "1";
  const sortOptions = SORTS.filter((s) => (q || s.value !== "relevance") && (deals || s.value !== "discount"));

  const [{ products, total }, subcategories, catName, counties, shops] = await Promise.all([
    searchProducts({ q, category: sp.category, subcategory: sp.subcategory, badge: sp.badge, county: sp.county, inStock: sp.stock === "1", deals, sort, limit: PAGE_SIZE * page }),
    sp.category ? getSubcategories(sp.category) : Promise.resolve([]),
    categoryName(sp.category),
    getCounties(),
    q && page === 1 ? searchShops(q, 4) : Promise.resolve([]),
  ]);
  const title = q ? `Results for "${q}"` : deals ? (catName ? `${catName} deals` : "Top deals") : catName ?? badgeTitle(sp.badge) ?? "All products";
  const nextParams = new URLSearchParams(Object.entries({ ...sp, page: String(page + 1) }).filter(([, v]) => v) as [string, string][]);
  const filtered = !!(sp.county || sp.stock || sp.category || sp.badge || sp.subcategory);
  const crumbs: Crumb[] = [{ label: "Products", href: (catName || q || sp.badge) ? "/products" : undefined }];
  if (catName && sp.category) {
    const sub = subcategories.find((s) => s.slug === sp.subcategory);
    crumbs.push({ label: catName, href: sub ? `/products?category=${sp.category}` : undefined });
    if (sub) crumbs.push({ label: sub.name });
  } else if (q) crumbs.push({ label: `Search: ${q}` });
  else if (sp.badge) crumbs.push({ label: badgeTitle(sp.badge) ?? "Deals" });

  return (
    <div className={`container ${styles.wrap}`}>
      <Breadcrumbs items={crumbs} />
      <h1 className={styles.title}>{title}</h1>
      <FilterBar category={sp.category} subcategory={sp.subcategory} badge={sp.badge} q={q} subcategories={subcategories} />
      <ListingControls sortOptions={sortOptions} counties={counties} showStock />

      {shops.length > 0 && (
        <section className={styles.shops} aria-label="Matching shops">
          <h2 className={styles.h2}>Shops</h2>
          <div className={styles.shopGrid}>{shops.map((s) => <ShopCard key={s.id} shop={s} />)}</div>
        </section>
      )}

      {products.length === 0 ? (
        <div className={styles.empty}>
          <PackageSearch size={40} strokeWidth={1.4} aria-hidden="true" />
          <p>No products found{q ? ` for "${q}"` : ""}{filtered ? " with these filters" : ""}.</p>
          <p className={styles.hint}>{q ? "Check the spelling, try fewer words, or " : "Try "}removing a filter.</p>
          {(q || filtered) && <Button href="/products" variant="soft">Clear search and filters</Button>}
        </div>
      ) : (
        <>
          {q && shops.length > 0 && <h2 className={styles.h2}>Products</h2>}
          <div className={styles.grid}>{products.map((p, i) => <ProductCard key={p.id} product={p} index={i % PAGE_SIZE} />)}</div>
          <LoadMore shown={products.length} total={Math.min(total, PAGE_SIZE * MAX_PAGES)} href={`/products?${nextParams.toString()}`} />
        </>
      )}
    </div>
  );
}
