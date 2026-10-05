"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCategories } from "@/lib/categories-context";
import styles from "./FilterBar.module.css";

type Subcategory = { slug: string; name: string };

type Props = { category?: string; subcategory?: string; badge?: string; q?: string; subcategories?: Subcategory[] };

// Badge / category / subcategory chips. Keeps the search term and the sort/county/stock controls.
export default function FilterBar({ category, subcategory, badge, q, subcategories = [] }: Props) {
  const params = useSearchParams();
  const categories = useCategories();
  const qs = (chips: Record<string, string | undefined>) => {
    const keep = { q, county: params.get("county") ?? undefined, sort: params.get("sort") ?? undefined, stock: params.get("stock") ?? undefined };
    const sp = new URLSearchParams(Object.entries({ ...keep, ...chips }).filter(([, v]) => v) as [string, string][]);
    const s = sp.toString();
    return `/products${s ? `?${s}` : ""}`;
  };
  return (
    <div className={styles.wrap}>
      <div className={styles.row}>
        <Link href={qs({ badge: undefined, category })} className={!badge ? styles.chipOn : styles.chip}>All</Link>
        <Link href={qs({ badge: "hot", category })} className={badge === "hot" ? styles.chipOn : styles.chip}>Hot deals</Link>
        <Link href={qs({ badge: "offer", category })} className={badge === "offer" ? styles.chipOn : styles.chip}>Offers</Link>
        <Link href={qs({ badge: "new", category })} className={badge === "new" ? styles.chipOn : styles.chip}>New</Link>
      </div>
      <div className={styles.row}>
        <Link href={qs({ badge })} className={!category ? styles.chipOn : styles.chip}>All categories</Link>
        {categories.map((c) => (
          <Link key={c.slug} href={qs({ category: c.slug, badge })} className={category === c.slug ? styles.chipOn : styles.chip}>{c.name}</Link>
        ))}
      </div>
      {category && subcategories.length > 0 && (
        <div className={styles.row}>
          <Link href={qs({ category, badge })} className={!subcategory ? styles.chipOn : styles.chip}>All {categories.find((c) => c.slug === category)?.name ?? ""}</Link>
          {subcategories.map((s) => (
            <Link key={s.slug} href={qs({ category, subcategory: s.slug, badge })} className={subcategory === s.slug ? styles.chipOn : styles.chip}>{s.name}</Link>
          ))}
        </div>
      )}
    </div>
  );
}
