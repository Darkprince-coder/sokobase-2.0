import { site } from "./site";
import type { HeroSlide } from "./types";

const DEFAULT_SLIDE: HeroSlide = {
  id: "default",
  title: "Shop trusted businesses across Kenya",
  subtitle: "Compare prices, save your favourites and order directly on WhatsApp.",
  ctaLabel: "Browse products",
  href: "/products",
};

// Later reads platform_settings from Supabase. Same return shape, pages won't change.
export async function getHeroSlides(): Promise<HeroSlide[]> {
  return site.heroSlides.length ? site.heroSlides : [DEFAULT_SLIDE];
}
