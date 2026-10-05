import { cache } from "react";
import { createPublicClient } from "./supabase/public";
import { categoryNames, one, type BusinessCategoriesRel, type Rel } from "./relations";
import type { PriceType, Product, ProductBadge } from "./types";

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


// Row shapes for the joined selects below. Without generated Supabase types, PostgREST embeds
// come back untyped (and may be an object or a one-element array), so they are described here.
type Money = number | string | null;
type NameRow = { name: string };
type ProductRow = {
  id: string; slug: string; name: string; price: Money; old_price: Money; price_type: PriceType | null; in_stock: boolean | null;
  badge: ProductBadge | null; images: string[] | null;
  businesses: Rel<{ id: string; name: string; slug: string; location: string; whatsapp: string }>;
  categories: Rel<NameRow & { slug?: string }>;
};
type ProductDetailRow = ProductRow & {
  description: string | null; specs: Record<string, string> | null; category_id: string | null; subcategories: Rel<NameRow>;
};
type ShopRow = {
  id: string; slug: string; name: string; location: string; logo_url: string | null;
  counties: Rel<{ slug: string; name: string }>; business_categories: BusinessCategoriesRel; products: Rel<{ count: number }>;
};
type StoreRow = {
  id: string; slug: string; name: string; description: string | null; location: string; whatsapp: string;
  logo_url: string | null; cover_url: string | null; counties: Rel<NameRow>; business_categories: BusinessCategoriesRel;
};
const rows = <T>(data: unknown): T[] => (data ?? []) as T[];

const PRODUCT_SELECT = "id, slug, name, price, old_price, price_type, in_stock, badge, images, businesses(id, name, slug, location, whatsapp), categories(name)";

function toProduct(row: ProductRow): Product {
  const biz = one(row.businesses);
  const cat = one(row.categories);
  return {
    id: row.id, slug: row.slug, name: row.name, price: row.price == null ? null : Number(row.price), oldPrice: row.old_price ? Number(row.old_price) : null,
    priceType: row.price_type ?? "fixed", inStock: row.in_stock ?? true,
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
  return rows<ProductRow>(data).map(toProduct);
}

// Saved items live in the visitor's browser as ids; this resolves them, keeping the saved order
// and silently dropping products that were deleted, unpublished or whose shop is no longer public.
export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  if (!ids.length) return [];
  const { data } = await createPublicClient().from("products").select(PRODUCT_SELECT).in("id", ids).eq("status", "published");
  const byId = new Map(rows<ProductRow>(data).map((row) => [row.id, toProduct(row)]));
  return ids.flatMap((id) => byId.get(id) ?? []);
}

export async function getSubcategories(categorySlug: string): Promise<{ id: string; slug: string; name: string }[]> {
  const db = createPublicClient();
  const { data: cat } = await db.from("categories").select("id").eq("slug", categorySlug).maybeSingle();
  if (!cat) return [];
  const { data } = await db.from("subcategories").select("id, slug, name").eq("category_id", cat.id).eq("active", true).order("sort_order");
  return data ?? [];
}

// cache(): generateMetadata and the page both ask for the same product in one request.
export const getProductBySlug = cache(async (slug: string): Promise<ProductDetail | null> => {
  const db = createPublicClient();
  const { data } = await db.from("products")
    .select("id, slug, name, description, price, old_price, price_type, in_stock, badge, images, specs, category_id, businesses(id, name, slug, location, whatsapp), categories(name, slug), subcategories(name)")
    .eq("slug", slug).eq("status", "published").maybeSingle();
  const row = data as ProductDetailRow | null;
  if (!row) return null;
  const { data: variants } = await db.from("product_variants").select("id, label, price, old_price, in_stock").eq("product_id", row.id).order("sort_order");
  const biz = one(row.businesses);
  const cat = one(row.categories);
  const sub = one(row.subcategories);
  return {
    ...toProduct(row), description: row.description ?? null, images: row.images ?? [],
    specs: row.specs ?? {}, categoryId: row.category_id,
    categorySlug: cat?.slug ?? null, subcategory: sub?.name ?? null, businessSlug: biz?.slug ?? "",
    variants: (variants ?? []).map((v) => ({ id: v.id, label: v.label, price: v.price == null ? null : Number(v.price), oldPrice: v.old_price ? Number(v.old_price) : null, inStock: v.in_stock })),
  };
});

export async function getSimilarProducts(categoryId: string | null, excludeId: string, limit = 8): Promise<Product[]> {
  if (!categoryId) return [];
  const db = createPublicClient();
  const { data } = await db.from("products").select(PRODUCT_SELECT).eq("status", "published").eq("category_id", categoryId).neq("id", excludeId).limit(limit);
  return rows<ProductRow>(data).map(toProduct);
}

export async function getCounties(): Promise<County[]> {
  const db = createPublicClient();
  const { data } = await db.from("counties").select("id, slug, name").order("sort_order");
  return data ?? [];
}

function toShop(b: ShopRow): Shop {
  const county = one(b.counties);
  return {
    id: b.id, slug: b.slug, name: b.name, location: b.location, county: county?.name ?? null, countySlug: county?.slug ?? null,
    categories: categoryNames(b.business_categories),
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
  return rows<ShopRow>(data).map(toShop);
}

export const getStoreBySlug = cache(async (slug: string): Promise<{ store: StoreDetail; products: Product[] } | null> => {
  const db = createPublicClient();
  const { data } = await db.from("businesses")
    .select("id, slug, name, description, location, whatsapp, logo_url, cover_url, counties(name), business_categories(categories(name))")
    .eq("slug", slug).eq("status", "active").maybeSingle();
  const b = data as StoreRow | null;
  if (!b) return null;
  const { data: products } = await db.from("products").select(PRODUCT_SELECT).eq("business_id", b.id).eq("status", "published").order("created_at", { ascending: false });
  return {
    store: {
      id: b.id, slug: b.slug, name: b.name, description: b.description, location: b.location,
      county: one(b.counties)?.name ?? null, whatsapp: b.whatsapp, logoUrl: b.logo_url, coverUrl: b.cover_url,
      categories: categoryNames(b.business_categories),
    },
    products: rows<ProductRow>(products).map(toProduct),
  };
});

export type PublicPlan = { id: string; slug: string; name: string; productLimit: number | null; priceKes: number; durationDays: number };

export async function getPlans(): Promise<PublicPlan[]> {
  const { data } = await createPublicClient().from("plans").select("id, slug, name, product_limit, price_kes, duration_days").eq("active", true).order("sort_order");
  return (data ?? []).map((p) => ({ id: p.id, slug: p.slug, name: p.name, productLimit: p.product_limit, priceKes: p.price_kes, durationDays: p.duration_days }));
}
