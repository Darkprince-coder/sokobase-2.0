export type ProductBadge = "hot" | "offer" | "new";

export type Product = {
  id: string;
  slug: string;
  name: string;
  price: number;
  oldPrice?: number | null; // when set and higher than price, shown struck through with a % badge
  badge?: ProductBadge | null;
  business: string;
  location: string;
  category: string;
  imageUrl?: string | null;
  whatsapp: string; // business WhatsApp, set at registration
};

export type HeroSlide = {
  id: string;
  imageUrl?: string | null;
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  href?: string;
};

export type Shop = { id: string; slug: string; name: string; location: string; category: string; products: number; verified: boolean };
