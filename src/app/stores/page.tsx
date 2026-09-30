import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { MapPin, Store as StoreIcon } from "lucide-react";
import { getShops, getCounties } from "@/lib/catalog";
import styles from "./stores.module.css";

export const metadata: Metadata = { title: "Shops", alternates: { canonical: "/stores" } };

export default async function StoresPage({ searchParams }: { searchParams: Promise<{ county?: string }> }) {
  const sp = await searchParams;
  const [shops, counties] = await Promise.all([getShops({ limit: 80, county: sp.county }), getCounties()]);

  return (
    <div className={`container ${styles.wrap}`}>
      <h1 className={styles.title}>All shops</h1>
      <div className={styles.filterRow}>
        <Link href="/stores" className={!sp.county ? styles.chipOn : styles.chip}>All counties</Link>
        {counties.map((c) => (
          <Link key={c.slug} href={`/stores?county=${c.slug}`} className={sp.county === c.slug ? styles.chipOn : styles.chip}>{c.name}</Link>
        ))}
      </div>
      {shops.length === 0 ? (
        <p className={styles.empty}>No shops found{sp.county ? " in this county" : ""} yet.</p>
      ) : (
        <div className={styles.grid}>
          {shops.map((s) => (
            <Link key={s.id} href={`/store/${s.slug}`} className={styles.card}>
              <span className={styles.logo}>
                {s.logoUrl ? <Image src={s.logoUrl} alt="" width={48} height={48} className={styles.logoImg} /> : <StoreIcon size={22} aria-hidden="true" />}
              </span>
              <span className={styles.info}>
                <strong>{s.name}</strong>
                <span className={styles.meta}><MapPin size={12} aria-hidden="true" />{s.location}{s.county ? `, ${s.county}` : ""} &middot; {s.products} products</span>
                {s.categories.length > 0 && <span className={styles.cat}>{s.categories.join(", ")}</span>}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
