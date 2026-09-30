import Link from "next/link";
import { categories } from "@/lib/categories";
import styles from "./FilterBar.module.css";

export default function FilterBar({ category, badge }: { category?: string; badge?: string }) {
  const qs = (params: Record<string, string | undefined>) => {
    const sp = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]);
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
          <Link key={c.slug} href={qs({ category: c.slug, badge })} className={category === c.slug ? styles.chipOn : styles.chip}>{c.label}</Link>
        ))}
      </div>
    </div>
  );
}
