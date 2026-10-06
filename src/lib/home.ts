import "server-only";
import { createPublicClient } from "./supabase/public";
import { createAdminClient } from "./supabase/admin";
import { buildHomeFeed, type Candidate, type CategoryRef } from "./home-feed";
import { findShops, getProductsByIds, type Shop } from "./catalog";
import type { Product } from "./types";

const POPULAR_DAYS = 14;

type Row = { id: string; business_id: string; category_id: string | null; created_at: string; price: number | string | null; old_price: number | string | null; featured_at?: string | null };

// Products good enough for the home page: published (RLS also hides lapsed shops), in stock, with a photo.
async function candidates(): Promise<Row[]> {
  const db = createPublicClient();
  const query = (cols: string) => db.from("products").select(cols).eq("status", "published").eq("in_stock", true).neq("images", "{}")
    .order("created_at", { ascending: false }).limit(400);
  let res = await query("id, business_id, category_id, created_at, price, old_price, featured_at");
  if (res.error?.code === "42703") res = await query("id, business_id, category_id, created_at, price, old_price"); // before migration 0013
  return (res.data ?? []) as unknown as Row[];
}

// WhatsApp order taps per product over the last two weeks (order_clicks is server-only).
async function clicksByProduct(): Promise<Map<string, number>> {
  const since = new Date(Date.now() - POPULAR_DAYS * 86400000).toISOString();
  const { data } = await createAdminClient().from("order_clicks").select("product_id").gte("created_at", since).not("product_id", "is", null).limit(20000);
  const counts = new Map<string, number>();
  for (const r of data ?? []) counts.set(r.product_id as string, (counts.get(r.product_id as string) ?? 0) + 1);
  return counts;
}

// Shops for the home page: admin-featured first, then verified, then shops with products, newest first.
async function homeShops(limit: number): Promise<Shop[]> {
  const { shops } = await findShops({ limit: 60 });
  const db = createPublicClient();
  const { data, error } = await db.from("businesses").select("id, featured_at").not("featured_at", "is", null);
  const featured = new Set(error ? [] : (data ?? []).map((r) => r.id as string));
  const score = (s: Shop) => (featured.has(s.id) ? 4 : 0) + (s.verified ? 2 : 0) + (s.products > 0 ? 1 : 0);
  return [...shops].sort((a, b) => score(b) - score(a)).slice(0, limit);
}

export type HomeSections = {
  featured: Product[]; deals: Product[]; popular: Product[]; fresh: Product[];
  categoryRails: { category: CategoryRef; products: Product[] }[]; explore: Product[]; shops: Shop[];
};

export async function getHomeSections(): Promise<HomeSections> {
  const [rows, clicks, { data: cats }, shops] = await Promise.all([
    candidates(),
    clicksByProduct().catch(() => new Map<string, number>()),
    createPublicClient().from("categories").select("id, slug, name").eq("active", true).order("sort_order"),
    homeShops(8),
  ]);
  const toNum = (v: number | string | null) => (v == null ? null : Number(v));
  const list: Candidate[] = rows.map((r) => ({
    id: r.id, shopId: r.business_id, categoryId: r.category_id, createdAt: new Date(r.created_at).getTime(),
    price: toNum(r.price), oldPrice: toNum(r.old_price), featured: !!r.featured_at, clicks: clicks.get(r.id) ?? 0,
  }));
  // Rotate once a day (Kenyan date), the same for every visitor that day.
  const seed = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" });
  const feed = buildHomeFeed({ candidates: list, categories: (cats ?? []) as CategoryRef[], seed, now: Date.now() });

  const ids = [...feed.featured, ...feed.deals, ...feed.popular, ...feed.fresh, ...feed.categoryRails.flatMap((r) => r.ids), ...feed.explore];
  const products = new Map((await getProductsByIds(ids)).map((p) => [p.id, p]));
  const pick = (list: string[]) => list.map((id) => products.get(id)).filter((p): p is Product => !!p);
  return {
    featured: pick(feed.featured), deals: pick(feed.deals), popular: pick(feed.popular), fresh: pick(feed.fresh),
    categoryRails: feed.categoryRails.map((r) => ({ category: r.category, products: pick(r.ids) })), explore: pick(feed.explore), shops,
  };
}
