"use client";
import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import ProductCard from "./ProductCard";
import Button from "./Button";
import { ProductGrid } from "./Skeleton";
import { useWishlist } from "@/lib/wishlist";
import { loadSavedProducts } from "@/app/saved/actions";
import type { Product } from "@/lib/types";
import styles from "./SavedList.module.css";

export default function SavedList() {
  const { ids, ready } = useWishlist();
  const [loaded, setLoaded] = useState<Product[] | null>(null);
  const key = ids.join(",");

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    loadSavedProducts(key ? key.split(",") : [])
      .then((items) => { if (!cancelled) setLoaded(items); })
      .catch(() => { if (!cancelled) setLoaded([]); });
    return () => { cancelled = true; };
  }, [key, ready]);

  if (!ready || !loaded) return <ProductGrid count={Math.min(Math.max(ids.length, 4), 10)} />;
  // Unsaving on this page hides the card at once, without waiting for a refetch.
  const items = loaded.filter((p) => ids.includes(p.id));

  if (!items.length) {
    return (
      <div className={styles.empty}>
        <span className={styles.icon}><Heart size={28} /></span>
        <h2>No saved items yet</h2>
        <p>Tap the heart on any product to keep it here.</p>
        <Button href="/products">Browse products</Button>
      </div>
    );
  }
  return <div className={styles.grid}>{items.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}</div>;
}
