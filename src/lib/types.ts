export type ProductBadge = "hot" | "offer" | "new";

export type Product = {
  id: string;
  slug: string;
  name: string;
  price: number;
  oldPrice?: number | null;
  badge?: ProductBadge | null;
  business: string;
  businessId: string;
  location: string;
  category: string;
  imageUrl?: string | null;
  whatsapp: string;
};

export type HeroSlide = {
  id: string;
  imageUrl?: string | null;
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  href?: string;
};
