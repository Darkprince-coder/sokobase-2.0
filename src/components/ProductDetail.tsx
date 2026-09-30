"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Heart, MapPin, MessageCircle, Store as StoreIcon } from "lucide-react";
import ProductGallery from "./ProductGallery";
import { formatKes, discountPercent } from "@/lib/format";
import { site, whatsappLink } from "@/lib/site";
import { useWishlist } from "@/lib/wishlist";
import { logOrderClick } from "@/lib/track";
import type { ProductDetail as PD } from "@/lib/catalog";
import styles from "./ProductDetail.module.css";

export default function ProductDetail({ product }: { product: PD }) {
  const { has, toggle } = useWishlist();
  const saved = has(product.id);
  const [variantId, setVariantId] = useState<string | null>(product.variants[0]?.id ?? null);
  const variant = product.variants.find((v) => v.id === variantId) ?? null;

  const price = variant?.price ?? product.price;
  const oldPrice = variant?.oldPrice ?? product.oldPrice;
  const inStock = variant ? variant.inStock : true;
  const off = discountPercent(price, oldPrice);

  const message = useMemo(() => {
    const variantLine = variant ? ` (${variant.label})` : "";
    return `Hi ${product.business}, I'm interested in "${product.name}"${variantLine} - ${site.url}/products/${product.slug}. Is it available?`;
  }, [product, variant]);

  const specs = Object.entries(product.specs).filter(([, v]) => v);

  return (
    <div className={styles.layout}>
      <div className={styles.left}>
        <ProductGallery images={product.images} name={product.name} />
      </div>

      <div className={styles.right}>
        {product.category && <p className={styles.crumb}>{product.category}</p>}
        <h1 className={styles.name}>{product.name}</h1>

        <div className={styles.priceRow}>
          <span className={styles.price}>{formatKes(price)}</span>
          {off > 0 && oldPrice && (
            <>
              <span className={styles.old}>{formatKes(oldPrice)}</span>
              <span className={styles.off}>-{off}%</span>
            </>
          )}
        </div>
        <p className={inStock ? styles.inStock : styles.outStock}>{inStock ? "In stock" : "Out of stock"}</p>

        {product.variants.length > 0 && (
          <div className={styles.variants}>
            <span className={styles.variantsLabel}>Options</span>
            <div className={styles.variantList}>
              {product.variants.map((v) => (
                <button key={v.id} type="button" onClick={() => setVariantId(v.id)} disabled={!v.inStock}
                  className={v.id === variantId ? styles.variantOn : styles.variant}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className={styles.actionRow}>
          <motion.button type="button" className={`${styles.heart} ${saved ? styles.heartOn : ""}`} aria-pressed={saved}
            aria-label={saved ? "Remove from saved" : "Save this product"} onClick={() => toggle(product.id)}
            whileTap={{ scale: 0.85 }} animate={saved ? { scale: [1, 1.25, 1] } : { scale: 1 }} transition={{ duration: 0.3 }}>
            <Heart size={19} fill={saved ? "currentColor" : "none"} />
          </motion.button>
          <a href={whatsappLink(product.whatsapp, message)} target="_blank" rel="noopener noreferrer" className={styles.orderDesktop} onClick={() => logOrderClick(product.businessId, product.id)}>
            <MessageCircle size={18} aria-hidden="true" /> Order on WhatsApp
          </a>
        </div>

        <Link href={`/store/${product.businessSlug}`} className={styles.shopCard}>
          <span className={styles.shopIcon}><StoreIcon size={18} aria-hidden="true" /></span>
          <span>
            <strong>{product.business}</strong>
            <span className={styles.shopLoc}><MapPin size={12} aria-hidden="true" />{product.location}</span>
          </span>
          <span className={styles.visit}>Visit shop</span>
        </Link>

        {specs.length > 0 && (
          <section className={styles.section}>
            <h2>Specifications</h2>
            <dl className={styles.specs}>
              {specs.map(([k, v]) => (
                <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
              ))}
            </dl>
          </section>
        )}

        {product.description && (
          <section className={styles.section}>
            <h2>Description</h2>
            <p className={styles.desc}>{product.description}</p>
          </section>
        )}
      </div>

      <a href={whatsappLink(product.whatsapp, message)} target="_blank" rel="noopener noreferrer" className={styles.orderMobile} onClick={() => logOrderClick(product.businessId, product.id)}>
        <MessageCircle size={18} aria-hidden="true" /> Order on WhatsApp {off > 0 ? formatKes(price) : ""}
      </a>
    </div>
  );
}
