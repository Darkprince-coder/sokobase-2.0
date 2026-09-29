"use client";
import { Heart } from "lucide-react";
import ProductCard from "./ProductCard";
import Button from "./Button";
import { useWishlist } from "@/lib/wishlist";
import { mockProducts } from "@/lib/mock";
import styles from "./SavedList.module.css";

// Session 6: fetch these product ids from Supabase instead of the mock list.
export default function SavedList() {
  const { ids, ready } = useWishlist();
  if (!ready) return null;
  const items = mockProducts.filter((p) => ids.includes(p.id));
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
