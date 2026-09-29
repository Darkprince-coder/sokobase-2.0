import Link from "next/link";
import { BadgeCheck, MapPin, ChevronRight } from "lucide-react";
import { mockShops } from "@/lib/mock";
import styles from "./ShopsSection.module.css";

// Shops link to /stores until store pages exist (Session 6).
export default function ShopsSection() {
  return (
    <section className={`container ${styles.section}`}>
      <div className={styles.card}>
        <header className={styles.head}>
          <h2>Featured shops</h2>
          <Link href="/stores" className={styles.all}>See all<ChevronRight size={16} aria-hidden="true" /></Link>
        </header>
        <ul className={styles.grid}>
          {mockShops.map((s) => (
            <li key={s.id}>
              <Link href="/stores" className={styles.shop}>
                <span className={styles.avatar} aria-hidden="true">{s.name.slice(0, 2).toUpperCase()}</span>
                <span className={styles.info}>
                  <strong>{s.name}{s.verified && <BadgeCheck size={16} className={styles.verified} aria-label="Verified" />}</strong>
                  <span className={styles.meta}><MapPin size={12} aria-hidden="true" />{s.location} &middot; {s.products} products</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
