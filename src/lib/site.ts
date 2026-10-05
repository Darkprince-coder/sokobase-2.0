import type { HeroSlide } from "./types";

export const site = {
  name: "SokoBase",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://sokobase.co.ke",
  // Separate hostname for login, admin and business dashboards. Never linked from the
  // public site, so customers never see it. See Session 4 instructions to set it up.
  portalUrl: process.env.NEXT_PUBLIC_PORTAL_URL ?? "https://portal.sokobase.co.ke",
  description:
    "Shop products and services from verified businesses across Kenya. Compare prices, save favourites and order directly on WhatsApp.",
  locale: "en_KE",
  supportWhatsapp: process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? "",
  // Hero slides fallback. The real slides are managed in Admin > Hero slides (lib/settings.ts).
  heroSlides: [] as HeroSlide[],
};

export const whatsappLink = (phone: string, text = "") =>
  `https://wa.me/${phone.replace(/\D/g, "")}${text ? `?text=${encodeURIComponent(text)}` : ""}`;

// Where "Sell on SokoBase" CTAs send a prospective business: a prefilled chat with the owner.
export const sellWhatsappLink = (planName?: string) =>
  site.supportWhatsapp
    ? whatsappLink(site.supportWhatsapp, `Hi SokoBase, I'd like to list my business${planName ? ` on the ${planName} plan` : ""}.`)
    : null;
