import { Flame, Sparkles, MessageCircle, Star, TrendingUp, LayoutGrid } from "lucide-react";
import HeroCarousel from "@/components/HeroCarousel";
import CategorySidebar from "@/components/CategorySidebar";
import PromoTiles from "@/components/PromoTiles";
import CategoryScroller from "@/components/CategoryScroller";
import TrustStrip from "@/components/TrustStrip";
import ProductSection from "@/components/ProductSection";
import ShopsSection from "@/components/ShopsSection";
import Button from "@/components/Button";
import { getHeroSlides } from "@/lib/settings";
import { getHomeSections } from "@/lib/home";
import { sellWhatsappLink } from "@/lib/site";
import styles from "./page.module.css";

// Rebuilt at most every 5 minutes (and whenever a shop changes); the mix rotates daily.
export const revalidate = 300;

export default async function Home() {
  const [slides, home] = await Promise.all([getHeroSlides(), getHomeSections()]);
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

      {home.featured.length > 0 && <ProductSection title="Handpicked for you" href="/products" products={home.featured} layout="rail" icon={<Star size={20} />} />}
      {home.deals.length > 0 && <ProductSection title="Top deals" href="/products?deals=1&sort=discount" products={home.deals} layout="rail" icon={<Flame size={20} />} tone="hot" />}
      {home.popular.length > 0 && <ProductSection title="Popular this week" href="/products" products={home.popular} layout="rail" icon={<TrendingUp size={20} />} />}
      <ShopsSection shops={home.shops} />
      {home.fresh.length > 0 && <ProductSection title="New arrivals" href="/products?sort=newest" products={home.fresh} layout="rail" icon={<Sparkles size={20} />} />}
      {home.categoryRails.map((r) => (
        <ProductSection key={r.category.id} title={r.category.name} href={`/products?category=${r.category.slug}`} products={r.products} layout="rail" />
      ))}
      {home.explore.length > 0 && <ProductSection title="More to explore" href="/products" products={home.explore} layout="grid" icon={<LayoutGrid size={20} />} />}

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
