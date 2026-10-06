"use client";
import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, ChevronRight, Heart, MapPin, ShieldCheck, Store as StoreIcon, Truck } from "lucide-react";
import ProductGallery from "./ProductGallery";
import ShareButton from "./ShareButton";
import ReportListing from "./ReportListing";
import WhatsAppIcon from "./WhatsAppIcon";
import { formatKes, formatPrice, discountPercent } from "@/lib/format";
import { site, whatsappLink } from "@/lib/site";
import { useWishlist } from "@/lib/wishlist";
import { logOrderClick } from "@/lib/track";
import { findVariant, groupsForDisplay, isColourGroup, priceRange, swatchFor, valueState, type Attributes } from "@/lib/variants";
import type { ProductDetail as PD } from "@/lib/catalog";
import styles from "./ProductDetail.module.css";

export default function ProductDetail({ product }: { product: PD }) {
  const { has, toggle } = useWishlist();
  const saved = has(product.id);
  const { groups, variants } = useMemo(() => groupsForDisplay(product.options, product.variants), [product]);

  // Preselect values that have only one choice; otherwise the customer chooses.
  const [selection, setSelection] = useState<Attributes>(() =>
    Object.fromEntries(groups.filter((g) => g.values.length === 1).map((g) => [g.name, g.values[0]])));
  const [nudge, setNudge] = useState(false);
  const selectorsRef = useRef<HTMLDivElement>(null);

  const variant = findVariant(variants, selection, groups);
  const missing = groups.filter((g) => !selection[g.name]);
  const range = priceRange(product.price, variants);

  const priceType = product.priceType;
  const price = variant ? variant.price ?? product.price : product.price;
  const oldPrice = variant ? (variant.price != null ? variant.oldPrice : product.oldPrice) : product.oldPrice;
  const inStock = variant ? variant.inStock : product.inStock;
  const off = priceType === "contact" ? 0 : discountPercent(price, oldPrice);
  const priceText = priceType === "contact" ? "Ask for price"
    : variant || range.min === range.max ? formatKes(price ?? 0)
    : `${formatKes(range.min ?? 0)} – ${formatKes(range.max ?? 0)}`;

  // Show the chosen colour's photo when it has one.
  const colourGroup = groups.find((g) => isColourGroup(g.name));
  const colourPhoto = colourGroup && selection[colourGroup.name]
    ? variants.find((v) => v.attributes[colourGroup.name] === selection[colourGroup.name] && v.imageUrl)?.imageUrl ?? null
    : null;
  const images = useMemo(() => (colourPhoto && !product.images.includes(colourPhoto) ? [colourPhoto, ...product.images] : product.images), [colourPhoto, product.images]);
  const photoIndex = colourPhoto ? Math.max(0, images.indexOf(colourPhoto)) : 0;

  const chosen = groups.map((g) => (selection[g.name] ? `${g.name}: ${selection[g.name]}` : null)).filter(Boolean).join(", ");
  const url = `${site.url}/products/${product.slug}`;
  const ask = priceType === "contact" ? "What's the price, and is it available?" : inStock ? "Is it available?" : "Will it be back in stock?";
  const message = `Hi ${product.business}, I'm interested in "${product.name}"${chosen ? ` (${chosen})` : ""} - ${url}. ${ask}`;
  const ready = missing.length === 0;

  const choose = (group: string, value: string) => { setSelection((s) => ({ ...s, [group]: s[group] === value ? "" : value })); setNudge(false); };
  const askToChoose = (e: React.MouseEvent) => {
    if (ready) { logOrderClick(product.businessId, product.id); return; }
    e.preventDefault();
    setNudge(true);
    selectorsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  const ctaLabel = !ready ? `Choose ${missing[0].name.toLowerCase()}` : inStock ? "Order on WhatsApp" : "Ask about restock";

  return (
    <div className={styles.layout}>
      <div className={styles.left}>
        <ProductGallery images={images} name={product.name} index={photoIndex} />
      </div>

      <div className={styles.right}>
        <h1 className={styles.name}>{product.name}</h1>
        <Link href={`/store/${product.businessSlug}`} className={styles.byline}>
          Sold by <strong>{product.business}</strong>{product.businessVerified && <BadgeCheck size={15} aria-label="Verified business" />}
          {product.location && <span className={styles.loc}><MapPin size={13} aria-hidden="true" />{product.location}</span>}
        </Link>

        <div className={styles.priceBox}>
          <div className={styles.priceRow}>
            <span className={priceType === "contact" ? styles.ask : styles.price}>{priceType === "from" && !variant && range.min === range.max ? formatPrice(price, "from") : priceText}</span>
            {off > 0 && oldPrice != null && <><span className={styles.old}>{formatKes(oldPrice)}</span><span className={styles.off}>-{off}%</span></>}
          </div>
          <p className={inStock ? styles.inStock : styles.outStock}>{inStock ? "In stock" : "Sold out"}{variant ? ` · ${variant.label}` : ""}</p>
        </div>

        {groups.length > 0 && (
          <div ref={selectorsRef} className={`${styles.selectors} ${nudge ? styles.nudge : ""}`}>
            {groups.map((g) => {
              const colour = isColourGroup(g.name);
              return (
                <fieldset key={g.name} className={styles.group}>
                  <legend>{g.name}{selection[g.name] ? <>: <strong>{selection[g.name]}</strong></> : nudge ? <em> (choose one)</em> : null}</legend>
                  <div className={styles.values}>
                    {g.values.map((value) => {
                      const st = valueState(variants, groups, selection, g.name, value);
                      const on = selection[g.name] === value;
                      const sw = colour ? swatchFor(value) : null;
                      return (
                        <button key={value} type="button" aria-pressed={on} disabled={st === "none"}
                          className={`${sw ? styles.swatchBtn : styles.valueBtn} ${on ? styles.on : ""} ${st === "out" ? styles.out : ""}`}
                          onClick={() => choose(g.name, value)} title={st === "out" ? `${value} (sold out)` : value}>
                          {sw ? <><i style={{ background: sw }} /><span className="visually-hidden">{value}</span></> : value}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              );
            })}
          </div>
        )}

        <div className={styles.actions}>
          <a href={whatsappLink(product.whatsapp, message)} target="_blank" rel="noopener noreferrer" className={inStock || !ready ? styles.orderBtn : `${styles.orderBtn} ${styles.orderMuted}`} onClick={askToChoose}>
            <WhatsAppIcon size={20} /> {ctaLabel}
          </a>
          <button type="button" className={`${styles.iconBtn} ${saved ? styles.savedOn : ""}`} aria-pressed={saved}
            aria-label={saved ? "Remove from saved" : "Save this product"} onClick={() => toggle(product.id)}>
            <Heart size={20} fill={saved ? "currentColor" : "none"} />
          </button>
          <ShareButton url={url} title={product.name} text={`${product.name} on SokoBase`} label="Share" />
        </div>

        <Link href={`/store/${product.businessSlug}`} className={styles.shopCard}>
          <span className={styles.shopLogo}>
            {product.businessLogo ? <Image src={`${product.businessLogo}#logo`} alt="" width={48} height={48} /> : <StoreIcon size={20} aria-hidden="true" />}
          </span>
          <span className={styles.shopInfo}>
            <strong>{product.business}{product.businessVerified && <BadgeCheck size={15} aria-label="Verified business" />}</strong>
            <span>{product.location || "Visit the shop"}</span>
          </span>
          <span className={styles.visit}>Visit shop <ChevronRight size={16} aria-hidden="true" /></span>
        </Link>

        <ul className={styles.assure}>
          <li><WhatsAppIcon size={16} /> Chat with the seller directly. No account needed.</li>
          <li><Truck size={16} aria-hidden="true" /> Agree on delivery or pick-up with the seller.</li>
          <li><ShieldCheck size={16} aria-hidden="true" /> Pay on delivery or at the shop when you can.</li>
        </ul>
      </div>

      <div className={styles.details}>
        {product.description && (
          <section className={styles.section}>
            <h2>Description</h2>
            <p className={styles.desc}>{product.description}</p>
          </section>
        )}
        {Object.keys(product.specs).length > 0 && (
          <section className={styles.section}>
            <h2>Specifications</h2>
            <dl className={styles.specs}>
              {Object.entries(product.specs).filter(([, v]) => v).map(([k, v]) => (
                <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
              ))}
            </dl>
          </section>
        )}
        <div className={styles.reportRow}><ReportListing businessId={product.businessId} productId={product.id} /></div>
      </div>

      <div className={styles.mobileBar}>
        <button type="button" className={`${styles.barIcon} ${saved ? styles.savedOn : ""}`} aria-pressed={saved}
          aria-label={saved ? "Remove from saved" : "Save this product"} onClick={() => toggle(product.id)}>
          <Heart size={20} fill={saved ? "currentColor" : "none"} />
        </button>
        <a href={whatsappLink(product.whatsapp, message)} target="_blank" rel="noopener noreferrer" className={inStock || !ready ? styles.barOrder : `${styles.barOrder} ${styles.orderMuted}`} onClick={askToChoose}>
          <WhatsAppIcon size={20} /> {ctaLabel}{ready && inStock && priceType !== "contact" && price != null ? ` · ${formatKes(price)}` : ""}
        </a>
      </div>
    </div>
  );
}
