import { cache } from "react";
import { createPublicClient } from "./supabase/public";
import { categoryNames, one, type BusinessCategoriesRel, type Rel } from "./relations";
import type { PriceType, Product, ProductBadge } from "./types";
import type { OptionGroup, PublicVariant } from "./variants";

export type ProductDetail = Product & {
  description: string | null;
  images: string[];
  specs: Record<string, string>;
  options: OptionGroup[];
  variants: PublicVariant[];
  categoryId: string | null;
  categorySlug: string | null;
  subcategory: string | null;
  subcategorySlug: string | null;
  businessSlug: string;
  businessLogo: string | null;
  businessVerified: boolean;
};
export type Shop = {
  id: string; slug: string; name: string; location: string; county: string | null; countySlug: string | null;
  categories: string[]; logoUrl: string | null; products: number; verified: boolean;
};
export type StoreDetail = {
  id: string; slug: string; name: string; description: string | null; location: string; county: string | null;
  whatsapp: string; logoUrl: string | null; coverUrl: string | null; categories: string[]; verified: boolean;
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
type ProductDetailRow = Omit<ProductRow, "businesses"> & {
  description: string | null; specs: Record<string, string> | null; category_id: string | null; subcategories: Rel<NameRow & { slug: string }>;
  options: OptionGroup[] | null;
  businesses: Rel<{ id: string; name: string; slug: string; location: string; whatsapp: string; logo_url: string | null; verified_at: string | null }>;
};
type ShopRow = {
  id: string; slug: string; name: string; location: string; logo_url: string | null; verified_at?: string | null;
  counties: Rel<{ slug: string; name: string }>; business_categories: BusinessCategoriesRel; products: Rel<{ count: number }>;
};
type StoreRow = {
  id: string; slug: string; name: string; description: string | null; location: string; whatsapp: string;
  logo_url: string | null; cover_url: string | null; verified_at?: string | null; counties: Rel<NameRow>; business_categories: BusinessCategoriesRel;
};
const rows = <T>(data: unknown): T[] => (data ?? []) as T[];

// verified_at arrives with migration 0008; until it is applied, shop queries retry without it.
const SHOP_SELECT = "id, slug, name, location, logo_url, verified_at, counties(slug, name), business_categories(categories(name)), products(count)";
const withoutVerified = (select: string) => select.replace(", verified_at", "");
async function shopQuery<T>(run: (select: string) => PromiseLike<{ data: T | null; error: { code?: string } | null }>, select: string) {
  const first = await run(select);
  return first.error?.code === "42703" ? run(withoutVerified(select)) : first;
}

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

export type ProductSort = "relevance" | "newest" | "price_asc" | "price_desc" | "discount";
export type ProductQuery = {
  q?: string; category?: string; subcategory?: string; county?: string; badge?: string;
  inStock?: boolean; deals?: boolean; sort?: ProductSort; limit?: number; offset?: number;
};

const idForSlug = async (table: "categories" | "counties", slug?: string) => {
  if (!slug) return null;
  const { data } = await createPublicClient().from(table).select("id").eq("slug", slug).maybeSingle();
  return (data?.id as string | undefined) ?? undefined; // undefined = unknown slug, so no results
};

// Ranked, typo-tolerant search with filters (search_products() in 0008). Falls back to the plain
// listing if the migration hasn't been applied yet.
export async function searchProducts(opts: ProductQuery): Promise<{ products: Product[]; total: number }> {
  const db = createPublicClient();
  const [categoryId, countyId] = await Promise.all([idForSlug("categories", opts.category), idForSlug("counties", opts.county)]);
  if (categoryId === undefined || countyId === undefined) return { products: [], total: 0 };
  let subcategoryId: string | null = null;
  if (opts.subcategory && categoryId) {
    const { data: sub } = await db.from("subcategories").select("id").eq("category_id", categoryId).eq("slug", opts.subcategory).maybeSingle();
    if (!sub) return { products: [], total: 0 };
    subcategoryId = sub.id;
  }
  const badge = opts.badge && ["hot", "offer", "new"].includes(opts.badge) ? opts.badge : null;
  const sort = opts.sort === "newest" ? "newest" : opts.sort ?? (opts.q ? "relevance" : "newest");

  const { data, error } = await db.rpc("search_products", {
    p_q: opts.q?.trim() || null, p_category_id: categoryId, p_subcategory_id: subcategoryId, p_county_id: countyId,
    p_badge: badge, p_in_stock: !!opts.inStock, p_sort: sort, p_limit: opts.limit ?? 24, p_offset: opts.offset ?? 0,
    ...(opts.deals ? { p_deals: true } : {}), // p_deals arrives with migration 0013; only sent when used
  });
  if (error) {
    const products = await getProducts({ q: opts.q, category: opts.category, subcategory: opts.subcategory, badge: opts.badge, limit: opts.limit });
    return { products, total: products.length };
  }
  const hits = (data ?? []) as { id: string; total: number }[];
  if (!hits.length) return { products: [], total: 0 };
  return { products: await getProductsByIds(hits.map((h) => h.id)), total: Number(hits[0].total) };
}

// Shops whose name matches a search, shown above product results.
export async function searchShops(q: string, limit = 6): Promise<Shop[]> {
  const term = q.replace(/[%,()*\\]/g, " ").trim().slice(0, 60);
  if (term.length < 2) return [];
  return (await findShops({ q: term, limit })).shops;
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
  // options / attributes / image_url arrive with migration 0011; until it is applied, fall back.
  const full = "id, slug, name, description, price, old_price, price_type, in_stock, badge, images, specs, options, category_id, businesses(id, name, slug, location, whatsapp, logo_url, verified_at), categories(name, slug), subcategories(name, slug)";
  let res = await db.from("products").select(full).eq("slug", slug).eq("status", "published").maybeSingle();
  if (res.error?.code === "42703") res = await db.from("products").select(full.replace(" options,", "")).eq("slug", slug).eq("status", "published").maybeSingle();
  const row = res.data as ProductDetailRow | null;
  if (!row) return null;
  const variantQuery = (cols: string) => db.from("product_variants").select(cols).eq("product_id", row.id).order("sort_order");
  let vres = await variantQuery("id, label, price, old_price, in_stock, attributes, image_url");
  if (vres.error?.code === "42703") vres = await variantQuery("id, label, price, old_price, in_stock");
  const variants = vres.data as unknown as { id: string; label: string; price: number | null; old_price: number | null; in_stock: boolean; attributes?: Record<string, string>; image_url?: string | null }[] | null;
  const biz = one(row.businesses);
  const cat = one(row.categories);
  const sub = one(row.subcategories);
  return {
    ...toProduct(row as unknown as ProductRow), description: row.description ?? null, images: row.images ?? [],
    specs: row.specs ?? {}, categoryId: row.category_id, options: Array.isArray(row.options) ? row.options : [],
    categorySlug: cat?.slug ?? null, subcategory: sub?.name ?? null, subcategorySlug: sub?.slug ?? null, businessSlug: biz?.slug ?? "",
    businessLogo: biz?.logo_url ?? null, businessVerified: !!biz?.verified_at,
    variants: (variants ?? []).map((v) => ({
      id: v.id, label: v.label, price: v.price == null ? null : Number(v.price), oldPrice: v.old_price ? Number(v.old_price) : null,
      inStock: v.in_stock, attributes: (v.attributes ?? {}) as Record<string, string>, imageUrl: v.image_url ?? null,
    })),
  };
});

export async function getSimilarProducts(categoryId: string | null, excludeId: string, limit = 8): Promise<Product[]> {
  if (!categoryId) return [];
  const db = createPublicClient();
  const { data } = await db.from("products").select(PRODUCT_SELECT).eq("status", "published").eq("category_id", categoryId).neq("id", excludeId).limit(limit);
  return rows<ProductRow>(data).map(toProduct);
}

export async function getShopProducts(businessId: string, excludeId: string, limit = 8): Promise<Product[]> {
  const { data } = await createPublicClient().from("products").select(PRODUCT_SELECT).eq("status", "published")
    .eq("business_id", businessId).neq("id", excludeId).order("created_at", { ascending: false }).limit(limit);
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
    logoUrl: b.logo_url, products: one(b.products)?.count ?? 0, verified: !!b.verified_at,
  };
}

export async function getShops(opts: { limit?: number; county?: string } = {}): Promise<Shop[]> {
  return (await findShops({ county: opts.county, limit: opts.limit ?? 40 })).shops;
}

// Shop directory: filter by county, category and name, newest first, with a total for "Load more".
export async function findShops(opts: { q?: string; county?: string; category?: string; limit?: number; offset?: number }): Promise<{ shops: Shop[]; total: number }> {
  const db = createPublicClient();
  const [countyId, categoryId] = await Promise.all([idForSlug("counties", opts.county), idForSlug("categories", opts.category)]);
  if (countyId === undefined || categoryId === undefined) return { shops: [], total: 0 };
  const term = (opts.q ?? "").replace(/[%,()*\\]/g, " ").trim().slice(0, 60);
  const limit = opts.limit ?? 24;
  const offset = opts.offset ?? 0;
  // An inner join on business_categories filters shops to the chosen category.
  const base = categoryId ? SHOP_SELECT + ", filter:business_categories!inner(category_id)" : SHOP_SELECT;
  const { data, count } = await shopQuery((select) => {
    let query = db.from("businesses").select(select, { count: "exact" }).eq("status", "active")
      .order("created_at", { ascending: false }).range(offset, offset + limit - 1);
    if (countyId) query = query.eq("county_id", countyId);
    if (categoryId) query = query.eq("filter.category_id", categoryId);
    if (term) query = query.ilike("name", `%${term}%`);
    return query.then((r) => ({ ...r, data: r.data as unknown, count: r.count }));
  }, base) as { data: unknown; count?: number | null };
  return { shops: rows<ShopRow>(data).map(toShop), total: count ?? 0 };
}

export const getStoreBySlug = cache(async (slug: string): Promise<{ store: StoreDetail; products: Product[] } | null> => {
  const db = createPublicClient();
  const { data } = await shopQuery(
    (select) => db.from("businesses").select(select).eq("slug", slug).eq("status", "active").maybeSingle(),
    "id, slug, name, description, location, whatsapp, logo_url, cover_url, verified_at, counties(name), business_categories(categories(name))",
  );
  const b = data as StoreRow | null;
  if (!b) return null;
  const { data: products } = await db.from("products").select(PRODUCT_SELECT).eq("business_id", b.id).eq("status", "published").order("created_at", { ascending: false });
  return {
    store: {
      id: b.id, slug: b.slug, name: b.name, description: b.description, location: b.location,
      county: one(b.counties)?.name ?? null, whatsapp: b.whatsapp, logoUrl: b.logo_url, coverUrl: b.cover_url,
      categories: categoryNames(b.business_categories), verified: !!b.verified_at,
    },
    products: rows<ProductRow>(products).map(toProduct),
  };
});

// Distinguishes a paused shop (suspended, or plan lapsed past the grace period) from a missing one.
export async function getShopStatus(slug: string): Promise<"public" | "unavailable" | "missing"> {
  const { data } = await createPublicClient().rpc("shop_status", { p_slug: slug });
  return data === "public" || data === "unavailable" ? data : "missing";
}

export type PublicPlan = { id: string; slug: string; name: string; productLimit: number | null; priceKes: number; durationDays: number };

export async function getPlans(): Promise<PublicPlan[]> {
  const { data } = await createPublicClient().from("plans").select("id, slug, name, product_limit, price_kes, duration_days").eq("active", true).order("sort_order");
  return (data ?? []).map((p) => ({ id: p.id, slug: p.slug, name: p.name, productLimit: p.product_limit, priceKes: p.price_kes, durationDays: p.duration_days }));
}
