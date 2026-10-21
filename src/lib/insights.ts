import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Source } from "@/lib/insights-source";

// Seller insights: views (once per visitor per page per day), WhatsApp order taps and where
// visitors came from. page_views/order_clicks are service-role only, so callers must pass a
// business id they have already verified the user owns (bizDb / requireBusiness).

export const RANGES = [7, 30, 90] as const;
export type Range = (typeof RANGES)[number];

type Daily = { day: string; product_views: number; shop_views: number; clicks: number };
type ProductRow = { product_id: string; views: number; clicks: number };
type Raw = { daily: Daily[]; products: ProductRow[]; sources: { source: Source; n: number }[] };

/** Today's date in Nairobi as YYYY-MM-DD. */
export function nairobiToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

async function raw(businessId: string, from: string, to: string): Promise<Raw> {
  const { data, error } = await createAdminClient().rpc("shop_insights", { p_business_id: businessId, p_from: from, p_to: to });
  if (error || !data) return { daily: [], products: [], sources: [] };
  return data as Raw;
}

const totals = (daily: Daily[]) => daily.reduce(
  (t, d) => ({ shopViews: t.shopViews + d.shop_views, productViews: t.productViews + d.product_views, clicks: t.clicks + d.clicks }),
  { shopViews: 0, productViews: 0, clicks: 0 },
);
export type Totals = ReturnType<typeof totals>;

export type ProductInsight = { id: string; name: string; slug: string; image: string | null; status: string; views: number; clicks: number };

export async function getInsights(businessId: string, days: Range, to = nairobiToday()) {
  const from = addDays(to, -(days - 1));
  const prevTo = addDays(from, -1);
  const prevFrom = addDays(prevTo, -(days - 1));
  const db = createAdminClient();

  const [current, previous, { data: catalogue }] = await Promise.all([
    raw(businessId, from, to),
    raw(businessId, prevFrom, prevTo),
    db.from("products").select("id, name, slug, images, status").eq("business_id", businessId),
  ]);

  const stats = new Map(current.products.map((p) => [p.product_id, p]));
  const products: ProductInsight[] = (catalogue ?? []).map((p) => ({
    id: p.id as string, name: p.name as string, slug: p.slug as string, image: (p.images as string[] | null)?.[0] ?? null, status: p.status as string,
    views: stats.get(p.id as string)?.views ?? 0, clicks: stats.get(p.id as string)?.clicks ?? 0,
  })).sort((a, b) => b.views - a.views || b.clicks - a.clicks || a.name.localeCompare(b.name));

  return {
    from, to, days,
    daily: current.daily.map((d) => ({ day: d.day, views: d.product_views + d.shop_views, clicks: d.clicks })),
    now: totals(current.daily),
    before: totals(previous.daily),
    products,
    sources: [...current.sources].sort((a, b) => b.n - a.n),
  };
}
export type Insights = Awaited<ReturnType<typeof getInsights>>;

/** Percentage change, or null when there is nothing to compare with. */
export function change(now: number, before: number): number | null {
  if (before === 0) return now === 0 ? 0 : null;
  return Math.round(((now - before) / before) * 100);
}
