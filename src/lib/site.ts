import type { HeroSlide } from "./types";

export const site = {
  name: "SokoBase",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://sokobase.co.ke",
  description:
    "Shop products and services from verified businesses across Kenya. Compare prices, save favourites and order directly on WhatsApp.",
  locale: "en_KE",
  supportWhatsapp: process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? "",
  // Hero slides. Add one or many; with 2+ they auto-rotate and can be swiped.
  // Leave empty to show the default green gradient slide.
  // Session 3 moves this to the admin dashboard.
  heroSlides: [] as HeroSlide[],
};

export const whatsappLink = (phone: string, text = "") =>
  `https://wa.me/${phone.replace(/\D/g, "")}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
