import { getProductBySlug } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { OG_SIZE, ogCard, ogPhoto } from "@/lib/og";

export const alt = "Product on SokoBase";
export const size = OG_SIZE;
export const contentType = "image/png";
export const revalidate = 3600;

// Preview card when a product link is shared: photo, name, price and shop.
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const product = await getProductBySlug((await params).slug);
  if (!product) return ogCard({ title: "Shop trusted businesses across Kenya", subtitle: "Order directly on WhatsApp" });
  return ogCard({
    eyebrow: product.business,
    title: product.name,
    subtitle: product.location ? `${product.location} · Order on WhatsApp` : "Order on WhatsApp",
    price: formatPrice(product.price, product.priceType),
    photo: ogPhoto(product.imageUrl),
  });
}
