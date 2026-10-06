import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { createPublicClient } from "@/lib/supabase/public";

// Regenerated hourly so new shops and products reach search engines without a redeploy.
export const revalidate = 3600;

const LIMIT = 5000; // one sitemap file holds up to 50,000 URLs; split into several files long before that

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const db = createPublicClient();
  // Anonymous client: RLS returns only public, live shops and their published products.
  const [products, shops, categories] = await Promise.all([
    db.from("products").select("slug, updated_at").eq("status", "published").order("updated_at", { ascending: false }).limit(LIMIT),
    db.from("businesses").select("slug, updated_at, counties(slug)").eq("status", "active").limit(LIMIT),
    db.from("categories").select("slug").eq("active", true).order("sort_order"),
  ]);
  const shopRows = (shops.data ?? []) as unknown as { slug: string; updated_at?: string; counties: { slug: string } | { slug: string }[] | null }[];
  const latest = (products.data?.[0]?.updated_at as string | undefined) ?? new Date().toISOString();
  const url = (path: string) => `${site.url}${path}`;

  const counties = new Set(shopRows.flatMap((s) => (Array.isArray(s.counties) ? s.counties : s.counties ? [s.counties] : []).map((c) => c.slug)));

  return [
    { url: url(""), lastModified: latest, changeFrequency: "daily", priority: 1 },
    { url: url("/products"), lastModified: latest, changeFrequency: "daily", priority: 0.8 },
    { url: url("/stores"), changeFrequency: "daily", priority: 0.7 },
    { url: url("/sell"), changeFrequency: "monthly", priority: 0.6 },
    ...["/about", "/contact", "/privacy", "/terms"].map((p) => ({ url: url(p), changeFrequency: "yearly" as const, priority: 0.3 })),
    ...(categories.data ?? []).map((c) => ({ url: url(`/products?category=${c.slug}`), changeFrequency: "daily" as const, priority: 0.7 })),
    ...[...counties].map((slug) => ({ url: url(`/stores?county=${slug}`), changeFrequency: "weekly" as const, priority: 0.5 })),
    ...shopRows.map((s) => ({ url: url(`/store/${s.slug}`), lastModified: s.updated_at, changeFrequency: "weekly" as const, priority: 0.6 })),
    ...(products.data ?? []).map((p) => ({ url: url(`/products/${p.slug}`), lastModified: p.updated_at as string, changeFrequency: "weekly" as const, priority: 0.6 })),
  ];
}
