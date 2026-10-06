"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import styles from "./ListingControls.module.css";

type Option = { value: string; label: string };
type Props = { sortOptions?: Option[]; counties: { slug: string; name: string }[]; showStock?: boolean };

// Sort / county / in-stock controls. They write to the URL so every filtered view is shareable and
// works with the back button; changing any filter starts again from page 1.
export default function ListingControls({ sortOptions, counties, showStock }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value); else next.delete(key);
    next.delete("page");
    const qs = next.toString();
    start(() => router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false }));
  };

  return (
    <div className={styles.bar} aria-busy={pending}>
      {sortOptions && (
        <label className={styles.control}>
          <span className={styles.label}>Sort</span>
          <select aria-label="Sort by" value={params.get("sort") ?? sortOptions[0].value} onChange={(e) => set("sort", e.target.value === sortOptions[0].value ? null : e.target.value)}>
            {sortOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
      )}
      <label className={styles.control}>
        <span className={styles.label}>County</span>
        <select aria-label="County" value={params.get("county") ?? ""} onChange={(e) => set("county", e.target.value || null)}>
          <option value="">All Kenya</option>
          {counties.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
      </label>
      {showStock && (
        <label className={styles.toggle}>
          <input type="checkbox" checked={params.get("stock") === "1"} onChange={(e) => set("stock", e.target.checked ? "1" : null)} />
          In stock
        </label>
      )}
      {pending && <span className={styles.loading} role="status">Updating…</span>}
    </div>
  );
}
