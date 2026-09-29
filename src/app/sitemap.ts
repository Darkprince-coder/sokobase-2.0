import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

// Session 6 adds every store and product from Supabase here.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return ["", "/products", "/stores", "/join"].map((path) => ({
    url: `${site.url}${path}`, lastModified: now, changeFrequency: path === "" ? "daily" : "weekly", priority: path === "" ? 1 : 0.7,
  }));
}
