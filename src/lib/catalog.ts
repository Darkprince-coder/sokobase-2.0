import { createPublicClient } from "./supabase/public";
import type { Product } from "./types";

export type Variant = { id: string; label: string; price: number | null; oldPrice: number | null; inStock: boolean };
export type ProductDetail = Product & {
  description: string | null;
  images: string[];
  specs: Record<string, string>;
  variants: Variant[];
  categoryId: string | null;
  categorySlug: string | null;
  subcategory: string | null;
  businessSlug: string;
};
export type Shop = {
  id: string; slug: string; name: string; location: string; county: string | null; countySlug: string | null;
  categories: string[]; logoUrl: string | null; products: number;
};
export type StoreDetail = {
  id: string; slug: string; name: string; description: string | null; location: string; county: string | null;
  whatsapp: string; logoUrl: string | null; coverUrl: string | null; categories: string[];
};
export type County = { id: string; slug: string; name: string };

const one = <T>(v: T | T[] | null | undefined): T | undefined => (Array.isArray(v) ? v[0] : v ?? undefined);
const many = <T>(v: T | T[] | null | undefined): T[] => (Array.isArray(v) ? v : v ? [v] : []);

const PRODUCT_SELECT = "id, slug, name, price, old_price, badge, images, businesses(id, name, slug, location, whatsapp), categories(name)";

function toProduct(row: any): Product {
  const biz = one(row.businesses);
  const cat = one(row.categories);
  return {
    id: row.id, slug: row.slug, name: row.name, price: Number(row.price ?? 0), oldPrice: row.old_price ? Number(row.old_price) : null,
    badge: row.badge, business: biz?.name ?? "SokoBase shop", businessId: biz?.id ?? "", location: biz?.location ?? "", category: cat?.name ?? "",
    imageUrl: row.images?.[0] ?? null, whatsapp: biz?.whatsapp ?? "",
  };
}

export async function getProducts(opts: { q?: string; category?: string; subcategory?: string; badge?: string; limit?: number } = {}): Promise<Product[]> {
  const db = createPublicClient();
  let query = db.from("products").select(PRODUCT_SELECT).eq("status", "published").order("created_at", { ascending: false }).limit(opts.limit ?? 60);
  if (opts.q) query = query.ilike("name", `%${opts.q}%`);
  if (opts.badge) query = query.eq("badge", opts.badge);
  if (opts.category) {
    const { data: cat } = await db.from("categories").select("id").eq("slug", opts.category).maybeSingle();
    if (!cat) return [];
    query = query.eq("category_id", cat.id);
    if (opts.subcategory) {
      const { data: sub } = await db.from("subcategories").select("id").eq("category_id", cat.id).eq("slug", opts.subcategory).maybeSingle();
      if (!sub) return [];
      query = query.eq("subcategory_id", sub.id);
    }
  }
  const { data } = await query;
  return (data ?? []).map(toProduct);
}

export async function getSubcategories(categorySlug: string): Promise<{ id: string; slug: string; name: string }[]> {
  const db = createPublicClient();
  const { data: cat } = await db.from("categories").select("id").eq("slug", categorySlug).maybeSingle();
  if (!cat) return [];
  const { data } = await db.from("subcategories").select("id, slug, name").eq("category_id", cat.id).eq("active", true).order("sort_order");
  return data ?? [];
}

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  const db = createPublicClient();
  const { data: row } = await db.from("products")
    .select("id, slug, name, description, price, old_price, badge, images, specs, category_id, businesses(id, name, slug, location, whatsapp), categories(name, slug), subcategories(name)")
    .eq("slug", slug).eq("status", "published").maybeSingle();
  if (!row) return null;
  const { data: variants } = await db.from("product_variants").select("id, label, price, old_price, in_stock").eq("product_id", row.id).order("sort_order");
  const biz = one((row as any).businesses);
  const cat = one((row as any).categories);
  const sub = one((row as any).subcategories);
  return {
    ...toProduct(row), description: (row as any).description ?? null, images: (row as any).images ?? [],
    specs: ((row as any).specs ?? {}) as Record<string, string>, categoryId: (row as any).category_id,
    categorySlug: cat?.slug ?? null, subcategory: sub?.name ?? null, businessSlug: biz?.slug ?? "",
    variants: (variants ?? []).map((v) => ({ id: v.id, label: v.label, price: v.price ? Number(v.price) : null, oldPrice: v.old_price ? Number(v.old_price) : null, inStock: v.in_stock })),
  };
}

export async function getSimilarProducts(categoryId: string | null, excludeId: string, limit = 8): Promise<Product[]> {
  if (!categoryId) return [];
  const db = createPublicClient();
  const { data } = await db.from("products").select(PRODUCT_SELECT).eq("status", "published").eq("category_id", categoryId).neq("id", excludeId).limit(limit);
  return (data ?? []).map(toProduct);
}

export async function getCounties(): Promise<County[]> {
  const db = createPublicClient();
  const { data } = await db.from("counties").select("id, slug, name").order("sort_order");
  return data ?? [];
}

function toShop(b: any): Shop {
  const county = one(b.counties);
  return {
    id: b.id, slug: b.slug, name: b.name, location: b.location, county: county?.name ?? null, countySlug: county?.slug ?? null,
    categories: many(b.business_categories).map((bc: any) => one(bc.categories)?.name).filter(Boolean),
    logoUrl: b.logo_url, products: one(b.products)?.count ?? 0,
  };
}

export async function getShops(opts: { limit?: number; county?: string } = {}): Promise<Shop[]> {
  const db = createPublicClient();
  let query = db.from("businesses")
    .select("id, slug, name, location, logo_url, counties(slug, name), business_categories(categories(name)), products(count)")
    .eq("status", "active").order("created_at", { ascending: false }).limit(opts.limit ?? 40);
  if (opts.county) {
    const { data: county } = await db.from("counties").select("id").eq("slug", opts.county).maybeSingle();
    if (!county) return [];
    query = query.eq("county_id", county.id);
  }
  const { data } = await query;
  return (data ?? []).map(toShop);
}

export async function getStoreBySlug(slug: string): Promise<{ store: StoreDetail; products: Product[] } | null> {
  const db = createPublicClient();
  const { data: b } = await db.from("businesses")
    .select("id, slug, name, description, location, whatsapp, logo_url, cover_url, counties(name), business_categories(categories(name))")
    .eq("slug", slug).eq("status", "active").maybeSingle();
  if (!b) return null;
  const { data: products } = await db.from("products").select(PRODUCT_SELECT).eq("business_id", b.id).eq("status", "published").order("created_at", { ascending: false });
  return {
    store: {
      id: b.id, slug: b.slug, name: b.name, description: b.description, location: b.location,
      county: one((b as any).counties)?.name ?? null, whatsapp: b.whatsapp, logoUrl: b.logo_url, coverUrl: b.cover_url,
      categories: many((b as any).business_categories).map((bc: any) => one(bc.categories)?.name).filter(Boolean),
    },
    products: (products ?? []).map(toProduct),
  };
}
