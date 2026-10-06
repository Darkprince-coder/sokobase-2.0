import { getStoreBySlug } from "@/lib/catalog";
import { OG_SIZE, ogCard, ogPhoto } from "@/lib/og";

export const alt = "Shop on SokoBase";
export const size = OG_SIZE;
export const contentType = "image/png";
export const revalidate = 3600;

// Preview card when a shop link is shared: logo (or first product photo), name, location, count.
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const result = await getStoreBySlug((await params).slug);
  if (!result) return ogCard({ title: "Shop trusted businesses across Kenya", subtitle: "Order directly on WhatsApp" });
  const { store, products } = result;
  const where = [store.location, store.county].filter(Boolean).join(", ");
  const count = `${products.length} product${products.length === 1 ? "" : "s"}`;
  return ogCard({
    eyebrow: store.verified ? "Verified shop" : "Shop on SokoBase",
    title: store.name,
    subtitle: [where, count].filter(Boolean).join(" · "),
    photo: ogPhoto(store.logoUrl) ?? ogPhoto(products.find((p) => p.imageUrl)?.imageUrl),
    round: !!store.logoUrl,
  });
}
