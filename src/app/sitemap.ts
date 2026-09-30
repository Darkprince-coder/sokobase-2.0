import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { getProducts, getShops } from "@/lib/catalog";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const [products, shops] = await Promise.all([getProducts({ limit: 500 }), getShops({ limit: 500 })]);
  const staticEntries: MetadataRoute.Sitemap = ["", "/products", "/stores"].map((path) => ({
    url: `${site.url}${path}`, lastModified: now, changeFrequency: path === "" ? "daily" : "hourly", priority: path === "" ? 1 : 0.7,
  }));
  const productEntries: MetadataRoute.Sitemap = products.map((p) => ({ url: `${site.url}/products/${p.slug}`, lastModified: now, changeFrequency: "daily", priority: 0.6 }));
  const shopEntries: MetadataRoute.Sitemap = shops.map((s) => ({ url: `${site.url}/store/${s.slug}`, lastModified: now, changeFrequency: "daily", priority: 0.5 }));
  return [...staticEntries, ...productEntries, ...shopEntries];
}
