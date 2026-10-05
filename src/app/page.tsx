import { Flame, Sparkles, MessageCircle } from "lucide-react";
import HeroCarousel from "@/components/HeroCarousel";
import CategorySidebar from "@/components/CategorySidebar";
import PromoTiles from "@/components/PromoTiles";
import CategoryScroller from "@/components/CategoryScroller";
import TrustStrip from "@/components/TrustStrip";
import ProductSection from "@/components/ProductSection";
import ShopsSection from "@/components/ShopsSection";
import Button from "@/components/Button";
import { getHeroSlides } from "@/lib/settings";
import { getProducts, getShops } from "@/lib/catalog";
import { sellWhatsappLink } from "@/lib/site";
import styles from "./page.module.css";

// Safety net: server actions revalidate these pages on every change; this catches anything missed.
export const revalidate = 300;

export default async function Home() {
  const [slides, deals, fresh, recommended, shops] = await Promise.all([
    getHeroSlides(),
    getProducts({ badge: "hot", limit: 12 }),
    getProducts({ badge: "new", limit: 8 }),
    getProducts({ limit: 12 }),
    getShops({ limit: 4 }),
  ]);
  const offers = deals.length ? deals : await getProducts({ badge: "offer", limit: 12 });
  const sellHref = sellWhatsappLink() ?? "/sell";

  return (
    <>
      <div className={`container ${styles.top}`}>
        <CategorySidebar />
        <HeroCarousel slides={slides} />
        <PromoTiles />
      </div>
      <CategoryScroller />
      <TrustStrip />
      {offers.length > 0 && <ProductSection title="Hot deals" href="/products?badge=hot" products={offers} layout="rail" icon={<Flame size={20} />} tone="hot" />}
      {fresh.length > 0 && <ProductSection title="New arrivals" href="/products?badge=new" products={fresh} layout="grid" icon={<Sparkles size={20} />} />}
      <ShopsSection shops={shops} />
      {recommended.length > 0 && <ProductSection title="Browse products" href="/products" products={recommended} layout="grid" />}
      <section className={`container ${styles.ctaWrap}`}>
        <div className={styles.cta}>
          <div>
            <h2>Sell on SokoBase</h2>
            <p>Post your products once and share a single link with every customer. Orders arrive straight in your WhatsApp.</p>
          </div>
          <Button href={sellHref} external={sellHref.startsWith("http")} variant="accent" size="lg" icon={<MessageCircle size={20} />}>Talk to us on WhatsApp</Button>
        </div>
      </section>
    </>
  );
}
