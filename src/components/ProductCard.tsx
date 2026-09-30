"use client";
import Image from "next/image";
import { motion } from "framer-motion";
import { Heart, MessageCircle, Package } from "lucide-react";
import Badge from "./Badge";
import { useWishlist } from "@/lib/wishlist";
import { logOrderClick } from "@/lib/track";
import { formatKes, discountPercent } from "@/lib/format";
import { site, whatsappLink } from "@/lib/site";
import type { Product } from "@/lib/types";
import styles from "./ProductCard.module.css";

export default function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const { has, toggle } = useWishlist();
  const saved = has(product.id);
  const off = discountPercent(product.price, product.oldPrice);
  const message = `Hi ${product.business}, I'm interested in "${product.name}" (${site.url}/products/${product.slug}). Is it still available?`;

  return (
    <motion.article
      className={styles.card}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.35, delay: Math.min(index, 5) * 0.05, ease: [0.22, 1, 0.36, 1] }}
    >
      <a href={`/products/${product.slug}`} className={styles.mediaLink}>
        <div className={styles.media}>
          {product.imageUrl ? (
            <Image src={product.imageUrl} alt={product.name} fill sizes="(max-width: 640px) 50vw, 20vw" className={styles.img} />
          ) : (
            <Package size={40} strokeWidth={1.5} className={styles.placeholder} aria-hidden="true" />
          )}
          <div className={styles.tags}>{product.badge && <Badge kind={product.badge} />}</div>
          {off > 0 && <span className={styles.off}>-{off}%</span>}
        </div>
      </a>
      <motion.button
        type="button"
        className={`${styles.heart} ${saved ? styles.saved : ""}`}
        aria-pressed={saved}
        aria-label={saved ? `Remove ${product.name} from saved` : `Save ${product.name}`}
        onClick={() => toggle(product.id)}
        whileTap={{ scale: 0.8 }}
        animate={saved ? { scale: [1, 1.25, 1] } : { scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Heart size={17} fill={saved ? "currentColor" : "none"} />
      </motion.button>
      <div className={styles.body}>
        <a href={`/products/${product.slug}`} className={styles.name}>{product.name}</a>
        <div className={styles.prices}>
          <span className={styles.price}>{formatKes(product.price)}</span>
          {off > 0 && product.oldPrice && <span className={styles.old}>{formatKes(product.oldPrice)}</span>}
        </div>
        <p className={styles.biz}>{product.business}</p>
        <a
          className={styles.order}
          href={whatsappLink(product.whatsapp, message)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => logOrderClick(product.businessId, product.id)}
        >
          <MessageCircle size={15} aria-hidden="true" />
          Order on WhatsApp
        </a>
      </div>
    </motion.article>
  );
}
