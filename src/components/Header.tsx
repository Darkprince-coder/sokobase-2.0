"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Heart } from "lucide-react";
import Logo from "./Logo";
import SearchBar from "./SearchBar";
import Button from "./Button";
import { useCategories } from "@/lib/categories-context";
import { useWishlist } from "@/lib/wishlist";
import styles from "./Header.module.css";

export default function Header() {
  const pathname = usePathname();
  const { count } = useWishlist();
  const categories = useCategories();
  return (
    <>
      <div className={styles.topbar}>
        <div className={`container ${styles.topInner}`}>
          <span>Order directly on WhatsApp from verified businesses</span>
          <Link href="/join">Sell on SokoBase</Link>
        </div>
      </div>
      <header className={styles.header}>
        <div className={`container ${styles.row}`}>
          <Logo size={38} />
          <div className={styles.search}><SearchBar /></div>
          <div className={styles.actions}>
            <Link href="/saved" className={styles.saved} aria-label={`Saved items${count ? `, ${count}` : ""}`}>
              <Heart size={22} />
              <AnimatePresence>
                {count > 0 && (
                  <motion.span key={count} className={styles.count} initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }} transition={{ type: "spring", stiffness: 500, damping: 22 }}>
                    {count}
                  </motion.span>
                )}
              </AnimatePresence>
              <span className={styles.savedLabel}>Saved</span>
            </Link>
            <span className={styles.sell}><Button href="/join" variant="accent" size="sm">Sell on SokoBase</Button></span>
          </div>
        </div>
        {pathname !== "/products" && <div className={`container ${styles.mobileSearch}`}><SearchBar /></div>}
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
