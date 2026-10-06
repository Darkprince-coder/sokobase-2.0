export type ProductBadge = "hot" | "offer" | "new";
export type PriceType = "fixed" | "from" | "contact";

export type Product = {
  id: string;
  slug: string;
  name: string;
  price: number | null; // null when priceType is "contact"
  oldPrice?: number | null;
  priceType: PriceType;
  inStock: boolean;
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
  imageOnly?: boolean; // banner image already contains its own text: show the image alone
};
