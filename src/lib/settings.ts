import { site } from "./site";
import { createPublicClient } from "./supabase/public";
import type { HeroSlide } from "./types";

const DEFAULT_SLIDE: HeroSlide = {
  id: "default",
  title: "Shop trusted businesses across Kenya",
  subtitle: "Compare prices, save your favourites and order directly on WhatsApp.",
  ctaLabel: "Browse products",
  href: "/products",
};

type Stored = { id?: string; title?: string; subtitle?: string; ctaLabel?: string; href?: string; imageUrl?: string };

// Reads slides saved in Admin > Hero slides. Falls back to lib/site.ts, then the default gradient slide.
export async function getHeroSlides(): Promise<HeroSlide[]> {
  try {
    const { data } = await createPublicClient().from("platform_settings").select("value").eq("key", "hero_slides").maybeSingle();
    const list: Stored[] = Array.isArray(data?.value) ? data.value : [];
    const slides = list
      .filter((s) => s.id && s.title)
      .map((s): HeroSlide => ({
        id: s.id!, title: s.title!, subtitle: s.subtitle || undefined,
        ctaLabel: s.ctaLabel || undefined, href: s.href || undefined, imageUrl: s.imageUrl || null,
      }));
    if (slides.length) return slides;
  } catch {
    // Supabase not configured yet: use the fallback below.
  }
  return site.heroSlides.length ? site.heroSlides : [DEFAULT_SLIDE];
}
