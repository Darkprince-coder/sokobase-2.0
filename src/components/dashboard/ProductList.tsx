"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Copy, Search } from "lucide-react";
import Button from "@/components/Button";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import { deleteProduct, duplicateProduct, toggleProductStatus, toggleProductStock } from "@/app/dashboard/actions";
import { formatPrice } from "@/lib/format";
import type { PriceType } from "@/lib/types";
import styles from "./dash.module.css";

export type DashProduct = {
  id: string; name: string; price: number | null; price_type: PriceType; status: "draft" | "published"; in_stock: boolean; images: string[] | null;
};
type Filter = "all" | "published" | "draft" | "out";

export default function ProductList({ products }: { products: DashProduct[] }) {
  const [term, setTerm] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const counts = useMemo(() => ({
    all: products.length,
    published: products.filter((p) => p.status === "published").length,
    draft: products.filter((p) => p.status === "draft").length,
    out: products.filter((p) => !p.in_stock).length,
  }), [products]);
  const shown = useMemo(() => {
    const t = term.trim().toLowerCase();
    return products.filter((p) =>
      (filter === "all" || (filter === "out" ? !p.in_stock : p.status === filter)) && (!t || p.name.toLowerCase().includes(t)));
  }, [products, term, filter]);

  const chips: { key: Filter; label: string }[] = [
    { key: "all", label: "All" }, { key: "published", label: "Published" }, { key: "draft", label: "Drafts" }, { key: "out", label: "Out of stock" },
  ];

  return (
    <>
      {products.length > 6 && (
        <div className={styles.listTools}>
          <label className={styles.searchBox}>
            <Search size={16} aria-hidden="true" />
            <input type="search" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search your products" aria-label="Search your products" />
          </label>
          <div className={styles.chipRow} role="group" aria-label="Filter products">
            {chips.map((c) => (
              <button key={c.key} type="button" aria-pressed={filter === c.key} className={filter === c.key ? styles.chipOn : styles.chip} onClick={() => setFilter(c.key)}>
                {c.label} ({counts[c.key]})
              </button>
            ))}
          </div>
        </div>
      )}

      {shown.length === 0 ? <p className={styles.empty}>No products match.</p> : (
        <div className={styles.prodGrid}>
          {shown.map((p) => (
            <div key={p.id} className={styles.prodCard}>
              {p.images?.[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.images[0]} alt="" className={styles.prodThumb} />
              ) : <div className={styles.prodThumb} />}
              <div className={styles.prodInfo}>
                <Link href={`/dashboard/products/${p.id}/edit`}>{p.name}</Link>
                <span className={styles.prodPrice}>{formatPrice(p.price, p.price_type)}</span>
                <div className={styles.prodMeta}>
                  <form action={toggleProductStock}>
                    <input type="hidden" name="id" value={p.id} /><input type="hidden" name="in_stock" value={String(p.in_stock)} />
                    <button type="submit" className={`${styles.pill} ${p.in_stock ? styles.pillOn : styles.pillOff}`} title="Tap to change">
                      {p.in_stock ? "In stock" : "Out of stock"}
                    </button>
                  </form>
                  <form action={toggleProductStatus}>
                    <input type="hidden" name="id" value={p.id} /><input type="hidden" name="status" value={p.status} />
                    <button type="submit" className={`${styles.pill} ${p.status === "published" ? styles.pillOn : styles.pillDraft}`} title="Tap to change">
                      {p.status === "published" ? "Published" : "Draft (hidden)"}
                    </button>
                  </form>
                </div>
              </div>
              <div className={styles.prodActions}>
                <Button href={`/dashboard/products/${p.id}/edit`} size="sm" variant="soft">Edit</Button>
                <form action={duplicateProduct}>
                  <input type="hidden" name="id" value={p.id} />
                  <Button type="submit" size="sm" variant="ghost" icon={<Copy size={14} />}>Duplicate</Button>
                </form>
                <form action={deleteProduct}>
                  <input type="hidden" name="id" value={p.id} />
                  <ConfirmSubmit label="Delete" question="Delete this product?" confirmLabel="Delete" />
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
