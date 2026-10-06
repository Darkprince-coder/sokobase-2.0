import { OG_SIZE, ogCard } from "@/lib/og";

export const alt = "SokoBase: shop trusted businesses across Kenya";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogCard({
    eyebrow: "sokobase.co.ke",
    title: "Shop trusted businesses across Kenya",
    subtitle: "Compare prices, save favourites and order directly on WhatsApp.",
  });
}
