"use client";
import Link from "next/link";
import { Heart } from "lucide-react";
import Logo from "./Logo";
import SearchBar from "./SearchBar";
import Button from "./Button";
import { useCategories } from "@/lib/categories-context";
import { useWishlist } from "@/lib/wishlist";
import styles from "./Header.module.css";

export default function Header() {
  const { count } = useWishlist();
  const categories = useCategories();
  return (
    <>
      <div className={styles.topbar}>
        <div className={`container ${styles.topInner}`}>
          <span>Order directly on WhatsApp from verified businesses</span>
          <Link href="/sell">Sell on SokoBase</Link>
        </div>
      </div>
      <header className={styles.header}>
        <div className={`container ${styles.row}`}>
          <Logo size={38} />
          <div className={styles.search}><SearchBar /></div>
          <div className={styles.actions}>
            <Link href="/saved" className={styles.saved} aria-label={`Saved items${count ? `, ${count}` : ""}`}>
              <Heart size={22} />
              {count > 0 && <span key={count} className={styles.count}>{count}</span>}
              <span className={styles.savedLabel}>Saved</span>
            </Link>
            <span className={styles.sell}><Button href="/sell" variant="accent" size="sm">Sell on SokoBase</Button></span>
          </div>
        </div>
        <div className={`container ${styles.mobileSearch}`}><SearchBar /></div>
        <nav className={styles.catnav} aria-label="Categories">
          <div className={`container ${styles.catInner}`}>
            <Link href="/products?badge=hot" className={styles.hot}>Hot deals</Link>
            {categories.slice(0, 8).map((c) => (
              <Link key={c.slug} href={`/products?category=${c.slug}`}>{c.name}</Link>
            ))}
          </div>
        </nav>
      </header>
    </>
  );
}
