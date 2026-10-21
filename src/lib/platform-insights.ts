import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { addDays, nairobiToday, type Range } from "@/lib/insights";
import type { Source } from "@/lib/insights-source";
import { estimatedMrr, firstSubs, lapsedBetween, liveAt, renewals, revenueBetween, trialConversion, type Sub } from "@/lib/platform-metrics";
import { pendingSignupIds } from "@/lib/signups";

// Admin > Insights: platform growth, money, buyer demand and shops that need attention.
type Db = ReturnType<typeof createAdminClient>;
const DAY = 86400000;
const nairobiMidnight = (day: string) => new Date(`${day}T00:00:00+03:00`).getTime();

type Raw = {
  daily: { day: string; views: number; product_views: number; visitors: number; clicks: number }[];
  sources: { source: Source; n: number }[];
  shops: { business_id: string; views: number; clicks: number }[];
  categories: { name: string; views: number; clicks: number }[];
  products: { product_id: string; name: string; slug: string; shop: string; views: number; clicks: number }[];
  catalogue: { business_id: string; published: number; last_update: string | null }[];
};
const EMPTY: Raw = { daily: [], sources: [], shops: [], categories: [], products: [], catalogue: [] };

async function raw(db: Db, from: string, to: string): Promise<Raw> {
  const { data, error } = await db.rpc("platform_insights", { p_from: from, p_to: to });
  return error || !data ? EMPTY : (data as Raw);
}

// PostgREST returns at most 1000 rows per request: page through.
async function all<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null }>): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < 50; i++) {
    const { data } = await page(i * 1000, i * 1000 + 999);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

const sumDaily = (r: Raw) => r.daily.reduce((t, d) => ({
  views: t.views + d.views, productViews: t.productViews + d.product_views, visitors: t.visitors + d.visitors, clicks: t.clicks + d.clicks,
}), { views: 0, productViews: 0, visitors: 0, clicks: 0 });

export async function getPlatformInsights(days: Range) {
  const db = createAdminClient();
  const to = nairobiToday();
  const from = addDays(to, -(days - 1));
  const prevTo = addDays(from, -1);
  const prevFrom = addDays(prevTo, -(days - 1));
  const now = Date.now();
  const t0 = nairobiMidnight(from), t1 = nairobiMidnight(addDays(to, 1)), p0 = nairobiMidnight(prevFrom);

  const [cur, prev, subs, shops, pending, { count: openReports }, { data: firstView }] = await Promise.all([
    raw(db, from, to),
    raw(db, prevFrom, prevTo),
    all<Sub>((a, b) => db.from("subscriptions").select("business_id, status, starts_at, ends_at, amount_kes, created_at").order("created_at").range(a, b)),
    all<{ id: string; name: string; slug: string; status: string; whatsapp: string; created_at: string }>((a, b) =>
      db.from("businesses").select("id, name, slug, status, whatsapp, created_at").order("created_at").range(a, b)),
    pendingSignupIds(db),
    db.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    db.from("page_views").select("viewed_on").order("viewed_on").limit(1).maybeSingle(),
  ]);
  // Views are only known from the first counted day; "no views" needs the whole period covered.
  const viewsSince = (firstView?.viewed_on as string | undefined) ?? null;
  const viewsCoverRange = !!viewsSince && viewsSince <= from;

  const activeShops = new Set(shops.filter((s) => s.status === "active").map((s) => s.id));
  const liveNow = [...liveAt(subs, now)].filter((id) => activeShops.has(id));

  // Weekly series for the last 12 weeks (ending today).
  const weeks = Array.from({ length: 12 }, (_, i) => addDays(to, -7 * (11 - i)));
  const liveByWeek = weeks.map((day) => ({ day, value: [...liveAt(subs, nairobiMidnight(addDays(day, 1)) - 1)].filter((id) => activeShops.has(id)).length }));
  const signupsByWeek = weeks.map((day) => {
    const end = nairobiMidnight(addDays(day, 1)), start = end - 7 * DAY;
    return { day, value: shops.filter((s) => { const c = new Date(s.created_at).getTime(); return c >= start && c < end; }).length };
  });

  // Revenue for the last 6 calendar months (Nairobi), by when payments were recorded.
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(`${to}T12:00:00Z`);
    d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - (5 - i));
    const start = d.toISOString().slice(0, 10);
    const next = new Date(d); next.setUTCMonth(next.getUTCMonth() + 1);
    return { day: start, value: revenueBetween(subs, nairobiMidnight(start), nairobiMidnight(next.toISOString().slice(0, 10))) };
  });

  const first = firstSubs(subs);
  const approvalsIn = (a: number, b: number) => [...first.values()].filter((s) => { const c = new Date(s.created_at).getTime(); return c >= a && c < b; }).length;
  const signupsIn = (a: number, b: number) => shops.filter((s) => { const c = new Date(s.created_at).getTime(); return c >= a && c < b; }).length;

  // Shops that need attention (live ones only).
  const activity = new Map(cur.shops.map((s) => [s.business_id, s]));
  const catalogue = new Map(cur.catalogue.map((c) => [c.business_id, c]));
  const shopById = new Map(shops.map((s) => [s.id, s]));
  const liveShops = liveNow.map((id) => shopById.get(id)!).filter(Boolean);
  const monthAgo = now - 30 * DAY;

  return {
    days, from, to, viewsSince, viewsCoverRange,
    growth: {
      liveNow: liveNow.length,
      liveStart: [...liveAt(subs, t0)].filter((id) => activeShops.has(id)).length,
      signups: signupsIn(t0, t1), signupsBefore: signupsIn(p0, t0),
      approvals: approvalsIn(t0, t1), approvalsBefore: approvalsIn(p0, t0),
      pending: pending.length,
      products: cur.catalogue.reduce((n, c) => n + c.published, 0),
      lapsed: lapsedBetween(subs, t0, t1).length,
      liveByWeek, signupsByWeek,
    },
    money: {
      ...estimatedMrr(subs, now),
      revenue: revenueBetween(subs, t0, t1), revenueBefore: revenueBetween(subs, p0, t0),
      months,
      conversion: trialConversion(subs, now),
      renewals: renewals(subs, now - 90 * DAY - 7 * DAY, now - 7 * DAY),
    },
    demand: {
      now: sumDaily(cur), before: sumDaily(prev),
      daily: cur.daily,
      sources: [...cur.sources].sort((a, b) => b.n - a.n),
      topShops: [...cur.shops].sort((a, b) => b.clicks - a.clicks || b.views - a.views).slice(0, 10)
        .map((s) => ({ ...s, name: shopById.get(s.business_id)?.name ?? "Deleted shop", id: s.business_id })),
      categories: [...cur.categories].sort((a, b) => b.views - a.views).slice(0, 10),
      products: cur.products,
    },
    attention: {
      noViews: liveShops.filter((s) => !activity.get(s.id)?.views),
      fewProducts: liveShops.filter((s) => (catalogue.get(s.id)?.published ?? 0) < 3),
      stale: liveShops.filter((s) => { const u = catalogue.get(s.id)?.last_update; return !u || new Date(u).getTime() < monthAgo; }),
      openReports: openReports ?? 0,
      pending: pending.length,
    },
  };
}
export type PlatformInsights = Awaited<ReturnType<typeof getPlatformInsights>>;
