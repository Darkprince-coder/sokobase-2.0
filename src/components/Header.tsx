"use client";
import Link from "next/link";
import { Heart, Store } from "lucide-react";
import Logo from "./Logo";
import SearchBar from "./SearchBar";
import Button from "./Button";
import MenuDrawer from "./MenuDrawer";
import CategoryMenu from "./CategoryMenu";
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
          <span>Order directly on WhatsApp from trusted Kenyan businesses</span>
          <Link href="/sell" className={styles.topSell}>Sell on SokoBase</Link>
        </div>
      </div>
      <header className={styles.header}>
        <div className={`container ${styles.row}`}>
          <span className={styles.menu}><MenuDrawer /></span>
          <Logo size={36} />
          <span className={styles.cats}><CategoryMenu /></span>
          <div className={styles.search}><SearchBar /></div>
          <div className={styles.actions}>
            {/* Phones and tablets: the full "Sell on SokoBase" button doesn't fit, so a compact one. */}
            <Link href="/sell" className={styles.sellMini}><Store size={16} aria-hidden="true" />Sell</Link>
            <Link href="/saved" className={styles.saved} aria-label={`Saved items${count ? `, ${count}` : ""}`}>
              <Heart size={22} />
              {count > 0 && <span key={count} className={styles.count}>{count}</span>}
              <span className={styles.savedLabel}>Saved</span>
            </Link>
            <span className={styles.sell}><Button href="/sell" variant="accent" size="sm">Sell on SokoBase</Button></span>
          </div>
        </div>
        <div className={`container ${styles.mobileSearch}`}><SearchBar /></div>
        <nav className={styles.catnav} aria-label="Popular categories">
          <div className={`container ${styles.catInner}`}>
            <Link href="/products?deals=1&sort=discount" className={styles.hot}>Deals</Link>
            <Link href="/products?sort=newest">New arrivals</Link>
            {categories.slice(0, 7).map((c) => (
              <Link key={c.slug} href={`/products?category=${c.slug}`}>{c.name}</Link>
            ))}
            <Link href="/stores">All shops</Link>
          </div>
        </nav>
      </header>
    </>
  );
}
