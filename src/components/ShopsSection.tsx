import Link from "next/link";
import Image from "next/image";
import { BadgeCheck, MapPin, ChevronRight, Store as StoreIcon } from "lucide-react";
import type { Shop } from "@/lib/catalog";
import styles from "./ShopsSection.module.css";

export default function ShopsSection({ shops }: { shops: Shop[] }) {
  if (shops.length === 0) return null;
  return (
    <section className={`container ${styles.section}`}>
      <div className={styles.card}>
        <header className={styles.head}>
          <h2>Featured shops</h2>
          <Link href="/stores" className={styles.all}>See all<ChevronRight size={16} aria-hidden="true" /></Link>
        </header>
        <ul className={styles.grid}>
          {shops.map((s) => (
            <li key={s.id}>
              <Link href={`/store/${s.slug}`} className={styles.shop}>
                <span className={styles.avatar} aria-hidden="true">
                  {s.logoUrl ? <Image src={s.logoUrl} alt="" width={46} height={46} className={styles.avatarImg} /> : <StoreIcon size={20} />}
                </span>
                <span className={styles.info}>
                  <strong>{s.name}{s.verified && <BadgeCheck size={16} className={styles.verified} aria-label="Verified business" />}</strong>
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
