"use client";
import Image from "next/image";
import Link from "next/link";
import { Heart, MessageCircle, Package } from "lucide-react";
import Badge from "./Badge";
import { useWishlist } from "@/lib/wishlist";
import { logOrderClick } from "@/lib/track";
import { formatKes, formatPrice, discountPercent } from "@/lib/format";
import { site, whatsappLink } from "@/lib/site";
import type { Product } from "@/lib/types";
import styles from "./ProductCard.module.css";

export default function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const { has, toggle } = useWishlist();
  const saved = has(product.id);
  const off = discountPercent(product.price, product.oldPrice);
  const message = product.inStock
    ? `Hi ${product.business}, I'm interested in "${product.name}" (${site.url}/products/${product.slug}). Is it still available?`
    : `Hi ${product.business}, is "${product.name}" (${site.url}/products/${product.slug}) coming back in stock?`;

  return (
    <article className={styles.card} style={{ "--i": Math.min(index, 5) } as React.CSSProperties}>
      <Link href={`/products/${product.slug}`} className={styles.mediaLink}>
        <div className={styles.media}>
          {product.imageUrl ? (
            <Image src={product.imageUrl} alt={product.name} fill sizes="(max-width: 640px) 50vw, 20vw" className={styles.img} />
          ) : (
            <Package size={40} strokeWidth={1.5} className={styles.placeholder} aria-hidden="true" />
          )}
          <div className={styles.tags}>{product.badge && <Badge kind={product.badge} />}</div>
          {off > 0 && product.inStock && <span className={styles.off}>-{off}%</span>}
          {!product.inStock && <span className={styles.soldOut}>Out of stock</span>}
        </div>
      </Link>
      <button
        type="button"
        className={`${styles.heart} ${saved ? styles.saved : ""}`}
        aria-pressed={saved}
        aria-label={saved ? `Remove ${product.name} from saved` : `Save ${product.name}`}
        onClick={() => toggle(product.id)}
      >
        <Heart size={18} fill={saved ? "currentColor" : "none"} />
      </button>
      <div className={styles.body}>
        <Link href={`/products/${product.slug}`} className={styles.name}>{product.name}</Link>
        <div className={styles.prices}>
          <span className={product.priceType === "contact" ? styles.ask : styles.price}>{formatPrice(product.price, product.priceType)}</span>
          {off > 0 && product.oldPrice && <span className={styles.old}>{formatKes(product.oldPrice)}</span>}
        </div>
        <p className={styles.biz}>{product.business}</p>
        <a
          className={product.inStock ? styles.order : `${styles.order} ${styles.orderMuted}`}
          href={whatsappLink(product.whatsapp, message)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => logOrderClick(product.businessId, product.id)}
        >
          <MessageCircle size={15} aria-hidden="true" />
          {product.inStock ? "Order on WhatsApp" : "Ask about restock"}
        </a>
      </div>
    </article>
  );
}
