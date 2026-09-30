import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { MapPin, Store as StoreIcon } from "lucide-react";
import { getShops } from "@/lib/catalog";
import styles from "./stores.module.css";

export const metadata: Metadata = { title: "Shops", alternates: { canonical: "/stores" } };

export default async function StoresPage() {
  const shops = await getShops({ limit: 60 });
  return (
    <div className={`container ${styles.wrap}`}>
      <h1 className={styles.title}>All shops</h1>
      {shops.length === 0 ? (
        <p className={styles.empty}>No shops yet. Check back soon.</p>
      ) : (
        <div className={styles.grid}>
          {shops.map((s) => (
            <Link key={s.id} href={`/store/${s.slug}`} className={styles.card}>
              <span className={styles.logo}>
                {s.logoUrl ? <Image src={s.logoUrl} alt="" width={48} height={48} className={styles.logoImg} /> : <StoreIcon size={22} aria-hidden="true" />}
              </span>
              <span className={styles.info}>
                <strong>{s.name}</strong>
                <span className={styles.meta}><MapPin size={12} aria-hidden="true" />{s.location} &middot; {s.products} products</span>
                {s.category && <span className={styles.cat}>{s.category}</span>}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
