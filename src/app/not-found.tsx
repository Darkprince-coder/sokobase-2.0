import type { Metadata } from "next";
import { Compass, Search } from "lucide-react";
import Button from "@/components/Button";
import styles from "@/components/StatusPage.module.css";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

export default function NotFound() {
  return (
    <section className={`container ${styles.wrap}`}>
      <span className={styles.icon}><Compass size={30} aria-hidden="true" /></span>
      <p className={styles.code}>404</p>
      <h1>We couldn&rsquo;t find that page</h1>
      <p className={styles.text}>The product or shop may have been removed, or the link may be mistyped. Try searching instead.</p>
      <form action="/products" method="get" role="search" className={styles.search}>
        <Search size={17} aria-hidden="true" />
        <input type="search" name="q" placeholder="Search products and shops" aria-label="Search SokoBase" />
        <button type="submit">Search</button>
      </form>
      <div className={styles.actions}>
        <Button href="/">Go to home page</Button>
        <Button href="/stores" variant="soft">Browse shops</Button>
      </div>
    </section>
  );
}
