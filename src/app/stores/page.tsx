import type { Metadata } from "next";
import Link from "next/link";
import { Search, Store as StoreIcon } from "lucide-react";
import ShopCard from "@/components/ShopCard";
import ListingControls from "@/components/ListingControls";
import LoadMore from "@/components/LoadMore";
import Button from "@/components/Button";
import { findShops, getCounties } from "@/lib/catalog";
import { createPublicClient } from "@/lib/supabase/public";
import styles from "./stores.module.css";

const PAGE_SIZE = 24;
const MAX_PAGES = 20;
type Search = { q?: string; county?: string; category?: string; page?: string };

export async function generateMetadata({ searchParams }: { searchParams: Promise<Search> }): Promise<Metadata> {
  const sp = await searchParams;
  const indexable = !sp.q && !sp.page && !sp.category;
  return {
    title: "Shops",
    description: "Browse verified businesses across Kenya. Find a shop near you and order directly on WhatsApp.",
    alternates: { canonical: sp.county && indexable ? `/stores?county=${sp.county}` : "/stores" },
    robots: indexable ? undefined : { index: false, follow: true },
  };
}

export default async function StoresPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const q = sp.q?.trim().slice(0, 60) || undefined;
  const page = Math.min(Math.max(Number.parseInt(sp.page ?? "1", 10) || 1, 1), MAX_PAGES);
  const [{ shops, total }, counties, { data: categories }] = await Promise.all([
    findShops({ q, county: sp.county, category: sp.category, limit: PAGE_SIZE * page }),
    getCounties(),
    createPublicClient().from("categories").select("slug, name").eq("active", true).order("sort_order"),
  ]);
  const href = (patch: Partial<Search>) => {
    const next = new URLSearchParams(Object.entries({ ...sp, page: undefined, ...patch }).filter(([, v]) => v) as [string, string][]);
    const qs = next.toString();
    return `/stores${qs ? `?${qs}` : ""}`;
  };
  const countyName = counties.find((c) => c.slug === sp.county)?.name;
  const filtered = !!(q || sp.county || sp.category);

  return (
    <div className={`container ${styles.wrap}`}>
      <h1 className={styles.title}>{countyName ? `Shops in ${countyName}` : "All shops"}</h1>

      <form action="/stores" method="get" role="search" className={styles.search}>
        <Search size={17} aria-hidden="true" />
        <input type="search" name="q" defaultValue={q} placeholder="Search shops by name" aria-label="Search shops" maxLength={60} />
        {sp.county && <input type="hidden" name="county" value={sp.county} />}
        {sp.category && <input type="hidden" name="category" value={sp.category} />}
        <button type="submit">Search</button>
      </form>

      <div className={styles.filterRow}>
        <Link href={href({ category: undefined })} className={!sp.category ? styles.chipOn : styles.chip}>All categories</Link>
        {(categories ?? []).map((c) => (
          <Link key={c.slug} href={href({ category: c.slug })} className={sp.category === c.slug ? styles.chipOn : styles.chip}>{c.name}</Link>
        ))}
      </div>
      <ListingControls counties={counties} />

      {shops.length === 0 ? (
        <div className={styles.empty}>
          <StoreIcon size={36} strokeWidth={1.4} aria-hidden="true" />
          <p>No shops found{q ? ` matching "${q}"` : ""}{countyName ? ` in ${countyName}` : ""} yet.</p>
          {filtered && <Button href="/stores" variant="soft">Show all shops</Button>}
        </div>
      ) : (
        <>
          <div className={styles.grid}>{shops.map((s) => <ShopCard key={s.id} shop={s} />)}</div>
          <LoadMore shown={shops.length} total={Math.min(total, PAGE_SIZE * MAX_PAGES)} href={href({ page: String(page + 1) })} />
        </>
      )}
    </div>
  );
}
