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
import { mockProducts } from "@/lib/mock";
import { site, whatsappLink } from "@/lib/site";
import styles from "./page.module.css";

export default async function Home() {
  const slides = await getHeroSlides();
  const deals = mockProducts.filter((p) => p.badge === "hot" || p.badge === "offer");
  const fresh = mockProducts.filter((p) => p.badge === "new");
  const sellHref = site.supportWhatsapp ? whatsappLink(site.supportWhatsapp, "Hi SokoBase, I want to list my business.") : "/join";

  return (
    <>
      <div className={`container ${styles.top}`}>
        <CategorySidebar />
        <HeroCarousel slides={slides} />
        <PromoTiles />
      </div>
      <CategoryScroller />
      <TrustStrip />
      <ProductSection title="Hot deals" href="/products?badge=hot" products={deals} layout="rail" icon={<Flame size={20} />} tone="hot" />
      <ProductSection title="New arrivals" href="/products?badge=new" products={fresh} layout="grid" icon={<Sparkles size={20} />} />
      <ShopsSection />
      <ProductSection title="Recommended for you" href="/products" products={mockProducts} layout="grid" />
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
