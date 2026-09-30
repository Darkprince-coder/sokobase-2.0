import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { MapPin, MessageCircle, PackageSearch, Store as StoreIcon } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import Button from "@/components/Button";
import { getStoreBySlug } from "@/lib/catalog";
import { whatsappLink } from "@/lib/site";
import styles from "./store.module.css";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const result = await getStoreBySlug((await params).slug);
  if (!result) return { title: "Shop not found" };
  return { title: result.store.name, description: result.store.description ?? `${result.store.name}, ${result.store.location}. Shop on SokoBase.`, alternates: { canonical: `/store/${result.store.slug}` } };
}

export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const result = await getStoreBySlug((await params).slug);
  if (!result) notFound();
  const { store, products } = result;

  return (
    <div className={styles.page}>
      {store.coverUrl && <div className={styles.cover}><Image src={store.coverUrl} alt="" fill sizes="100vw" className={styles.coverImg} /></div>}
      <div className={`container ${styles.head}`}>
        <span className={styles.logo}>
          {store.logoUrl ? <Image src={store.logoUrl} alt={store.name} width={72} height={72} className={styles.logoImg} /> : <StoreIcon size={30} aria-hidden="true" />}
        </span>
        <div className={styles.info}>
          <h1>{store.name}</h1>
          <p className={styles.meta}><MapPin size={13} aria-hidden="true" />{store.location}{store.category ? ` \u00b7 ${store.category}` : ""}</p>
          {store.description && <p className={styles.desc}>{store.description}</p>}
        </div>
        <Button href={whatsappLink(store.whatsapp, `Hi ${store.name}, I found your shop on SokoBase.`)} external icon={<MessageCircle size={16} />}>Chat on WhatsApp</Button>
      </div>

      <div className="container">
        <h2 className={styles.h2}>Products ({products.length})</h2>
        {products.length === 0 ? (
          <div className={styles.empty}><PackageSearch size={36} strokeWidth={1.4} aria-hidden="true" /><p>This shop hasn&apos;t posted any products yet.</p></div>
        ) : (
          <div className={styles.grid}>{products.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}</div>
        )}
      </div>
    </div>
  );
}
