import type { MetadataRoute } from "next";
import { BIZ_APP_NAME, BIZ_THEME } from "@/lib/portal-app";

// Web app manifest for shop owners (see lib/portal-app.ts). Served on the portal hostname,
// so "Install app" there adds SokoBase Biz, separate from the customer app.
export const dynamic = "force-static";

export function GET() {
  const manifest: MetadataRoute.Manifest = {
    id: "/dashboard",
    name: BIZ_APP_NAME,
    short_name: BIZ_APP_NAME,
    description: "Manage your SokoBase shop: add products, update prices and share your shop link.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F4F5F4",
    theme_color: BIZ_THEME,
    lang: "en-KE",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icons/biz-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/biz-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/biz-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Add a product", url: "/dashboard/products/new", icons: [{ src: "/icons/biz-192.png", sizes: "192x192" }] },
      { name: "My products", url: "/dashboard/products", icons: [{ src: "/icons/biz-192.png", sizes: "192x192" }] },
      { name: "My shop", url: "/dashboard/profile", icons: [{ src: "/icons/biz-192.png", sizes: "192x192" }] },
    ],
  };
  return new Response(JSON.stringify(manifest), {
    headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=3600" },
  });
}
