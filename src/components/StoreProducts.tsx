"use client";
import { useMemo, useState } from "react";
import { PackageSearch, Search } from "lucide-react";
import ProductCard from "./ProductCard";
import type { Product } from "@/lib/types";
import styles from "./StoreProducts.module.css";

// A shop's full catalogue is already on the page, so searching and filtering within the shop is
// instant and works offline. Controls only appear once a shop has enough products to need them.
export default function StoreProducts({ products }: { products: Product[] }) {
  const [term, setTerm] = useState("");
  const [category, setCategory] = useState("");
  const categories = useMemo(() => [...new Set(products.map((p) => p.category).filter(Boolean))].sort(), [products]);

  const shown = useMemo(() => {
    const t = term.trim().toLowerCase();
    return products.filter((p) => (!category || p.category === category) && (!t || p.name.toLowerCase().includes(t)));
  }, [products, term, category]);

  if (products.length === 0) {
    return <div className={styles.empty}><PackageSearch size={36} strokeWidth={1.4} aria-hidden="true" /><p>This shop hasn&apos;t posted any products yet.</p></div>;
  }

  return (
    <>
      {products.length > 6 && (
        <div className={styles.tools}>
          <label className={styles.search}>
            <Search size={16} aria-hidden="true" />
            <input type="search" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search this shop" aria-label="Search this shop" />
          </label>
          {categories.length > 1 && (
            <div className={styles.chips} role="group" aria-label="Filter by category">
              <button type="button" className={!category ? styles.chipOn : styles.chip} onClick={() => setCategory("")}>All</button>
              {categories.map((c) => (
                <button key={c} type="button" className={category === c ? styles.chipOn : styles.chip} aria-pressed={category === c} onClick={() => setCategory(c)}>{c}</button>
              ))}
            </div>
          )}
        </div>
      )}
      {shown.length === 0 ? (
        <div className={styles.empty}><p>No products match{term ? ` "${term}"` : ""} in this shop.</p></div>
      ) : (
        <div className={styles.grid}>{shown.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}</div>
      )}
    </>
  );
}
