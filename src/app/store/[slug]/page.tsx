import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { BadgeCheck, MapPin, Store as StoreIcon } from "lucide-react";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import StoreProducts from "@/components/StoreProducts";
import ShareButton from "@/components/ShareButton";
import ReportListing from "@/components/ReportListing";
import Breadcrumbs from "@/components/Breadcrumbs";
import Button from "@/components/Button";
import { getShopStatus, getStoreBySlug } from "@/lib/catalog";
import ComingSoon from "@/components/ComingSoon";
import { site, whatsappLink } from "@/lib/site";
import { jsonLdString } from "@/lib/jsonld";
import styles from "./store.module.css";
import ViewTracker from "@/components/ViewTracker";

// Safety net: server actions revalidate these pages on every change; this catches anything missed.
export const revalidate = 300;

// Render each page on its first visit, then serve it from cache until revalidated (ISR).
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const result = await getStoreBySlug((await params).slug);
  if (!result) return { title: "Shop not available", robots: { index: false } };
  return { title: result.store.name, description: result.store.description ?? `${result.store.name}, ${result.store.location}. Shop on SokoBase.`, alternates: { canonical: `/store/${result.store.slug}` } };
}

export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug;
  const result = await getStoreBySlug(slug);
  if (!result) {
    if ((await getShopStatus(slug)) === "unavailable") {
      return <ComingSoon title="This shop is taking a break" text="It isn't accepting orders on SokoBase right now. Browse other shops in the meantime." />;
    }
    notFound();
  }
  const { store, products } = result;
  const url = `${site.url}/store/${store.slug}`;
  const ld = {
    "@context": "https://schema.org", "@type": "Store", name: store.name, url, description: store.description ?? undefined,
    image: store.logoUrl ?? undefined,
    address: { "@type": "PostalAddress", addressLocality: store.location, addressRegion: store.county ?? undefined, addressCountry: "KE" },
  };

  return (
    <div className={styles.page}>
      <ViewTracker businessId={store.id} />
      <div className="container">
        <Breadcrumbs items={[{ label: "Shops", href: "/stores" }, { label: store.name }]} />
        {store.coverUrl && (
          <div className={styles.cover}>
            <Image src={`${store.coverUrl}#cover`} alt="" fill sizes="(max-width: 1200px) 100vw, 1140px" className={styles.coverImg} preload />
          </div>
        )}
      </div>
      <div className={`container ${styles.head} ${store.coverUrl ? styles.withCover : ""}`}>
        <span className={styles.logo}>
          {store.logoUrl ? <Image src={`${store.logoUrl}#logo`} alt={store.name} width={88} height={88} className={styles.logoImg} /> : <StoreIcon size={32} aria-hidden="true" />}
        </span>
        <div className={styles.info}>
          <h1 className={styles.name}>{store.name}{store.verified && <BadgeCheck size={20} className={styles.verified} aria-label="Verified business" />}</h1>
          <p className={styles.meta}><MapPin size={13} aria-hidden="true" />{store.location}{store.county ? `, ${store.county}` : ""}</p>
          {store.categories.length > 0 && <div className={styles.cats}>{store.categories.map((c) => <span key={c} className={styles.catChip}>{c}</span>)}</div>}
          {store.description && <p className={styles.desc}>{store.description}</p>}
        </div>
        <div className={styles.actions}>
          <Button href={whatsappLink(store.whatsapp, `Hi ${store.name}, I found your shop on SokoBase.`)} external icon={<WhatsAppIcon size={18} />}>Chat on WhatsApp</Button>
          <ShareButton url={url} title={store.name} text={`Check out ${store.name} on SokoBase`} />
        </div>
      </div>

      <div className="container">
        <h2 className={styles.h2}>Products ({products.length})</h2>
        <StoreProducts products={products} />
        <div className={styles.report}><ReportListing businessId={store.id} label="Report this shop" /></div>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(ld) }} />
    </div>
  );
}
