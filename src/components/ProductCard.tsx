"use client";
import Image from "next/image";
import Link from "next/link";
import { Heart, MapPin, Package } from "lucide-react";
import Badge from "./Badge";
import WhatsAppIcon from "./WhatsAppIcon";
import { useWishlist } from "@/lib/wishlist";
import { logOrderClick } from "@/lib/track";
import { formatKes, formatPrice, discountPercent } from "@/lib/format";
import { site, whatsappLink } from "@/lib/site";
import type { Product } from "@/lib/types";
import styles from "./ProductCard.module.css";

// Marketplace card: square photo (smart-cropped to fill), name, price, shop and a quick
// WhatsApp button. Tapping anywhere else opens the product.
export default function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const { has, toggle } = useWishlist();
  const saved = has(product.id);
  const off = product.inStock ? discountPercent(product.price, product.oldPrice) : 0;
  const href = `/products/${product.slug}`;
  const message = product.inStock
    ? `Hi ${product.business}, I'm interested in "${product.name}" (${site.url}${href}). Is it still available?`
    : `Hi ${product.business}, is "${product.name}" (${site.url}${href}) coming back in stock?`;

  return (
    <article className={`${styles.card} ${product.inStock ? "" : styles.soldOutCard}`} style={{ "--i": Math.min(index, 5) } as React.CSSProperties}>
      <Link href={href} className={styles.mediaLink} tabIndex={-1} aria-hidden="true">
        <div className={styles.media}>
          {product.imageUrl ? (
            <Image src={`${product.imageUrl}#fill`} alt="" fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 240px" className={styles.img} />
          ) : (
            <Package size={40} strokeWidth={1.5} className={styles.placeholder} aria-hidden="true" />
          )}
          {product.badge && <span className={styles.tag}><Badge kind={product.badge} /></span>}
          {off > 0 && <span className={styles.off}>-{off}%</span>}
          {!product.inStock && <span className={styles.soldOut}>Out of stock</span>}
        </div>
      </Link>
      <button type="button" className={`${styles.heart} ${saved ? styles.saved : ""}`} aria-pressed={saved}
        aria-label={saved ? `Remove ${product.name} from saved` : `Save ${product.name}`} onClick={() => toggle(product.id)}>
        <Heart size={18} fill={saved ? "currentColor" : "none"} />
      </button>
      <div className={styles.body}>
        <Link href={href} className={styles.name}>{product.name}</Link>
        <div className={styles.bottom}>
          <div className={styles.priceBox}>
            {/* Products with options show their lowest price: the option the product page opens on. */}
            <span className={product.priceType === "contact" || product.price == null ? styles.ask : styles.price}>
              {product.priceType === "from" && product.price != null ? formatKes(product.price) : formatPrice(product.price, product.priceType)}
            </span>
            {off > 0 && product.oldPrice ? <span className={styles.old}>{formatKes(product.oldPrice)}</span>
              : product.priceType === "from" ? <span className={styles.opts}>More options</span> : null}
          </div>
          <a className={styles.wa} href={whatsappLink(product.whatsapp, message)} target="_blank" rel="noopener noreferrer"
            onClick={() => logOrderClick(product.businessId, product.id)}
            aria-label={product.inStock ? `Order ${product.name} on WhatsApp` : `Ask ${product.business} about restock on WhatsApp`}>
            <WhatsAppIcon size={18} />
          </a>
        </div>
        <p className={styles.biz}>
          <span className={styles.bizName}>{product.business}</span>
          {product.location && <span className={styles.loc}><MapPin size={11} aria-hidden="true" />{product.location}</span>}
        </p>
      </div>
    </article>
  );
}
