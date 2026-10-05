import Link from "next/link";
import Image from "next/image";
import { BadgeCheck, MapPin, Store as StoreIcon } from "lucide-react";
import type { Shop } from "@/lib/catalog";
import styles from "./ShopCard.module.css";

export default function ShopCard({ shop }: { shop: Shop }) {
  return (
    <Link href={`/store/${shop.slug}`} className={styles.card}>
      <span className={styles.logo}>
        {shop.logoUrl ? <Image src={shop.logoUrl} alt="" width={52} height={52} className={styles.logoImg} /> : <StoreIcon size={22} aria-hidden="true" />}
      </span>
      <span className={styles.info}>
        <strong className={styles.name}>
          <span>{shop.name}</span>
          {shop.verified && <BadgeCheck size={16} className={styles.verified} aria-label="Verified business" />}
        </strong>
        <span className={styles.meta}><MapPin size={12} aria-hidden="true" />{shop.location}{shop.county ? `, ${shop.county}` : ""}</span>
        <span className={styles.meta}>{shop.products} product{shop.products === 1 ? "" : "s"}{shop.categories.length ? ` · ${shop.categories.join(", ")}` : ""}</span>
      </span>
    </Link>
  );
}
