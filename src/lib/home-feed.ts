// Chooses what the home page shows. Pure (no database) and unit-tested.
//
// Principles: every section is diverse (at most PER_SHOP products from one shop, interleaved
// shop by shop), a product appears only once on the page, popularity comes from real WhatsApp
// order taps, deals are real discounts (not self-applied badges), and the order rotates daily
// (deterministic per day, so the page doesn't reshuffle on every visit).

export type Candidate = {
  id: string; shopId: string; categoryId: string | null; createdAt: number;
  price: number | null; oldPrice: number | null; featured: boolean; clicks: number;
};
export type CategoryRef = { id: string; slug: string; name: string };
export type HomeFeed = {
  featured: string[]; deals: string[]; popular: string[]; fresh: string[];
  categoryRails: { category: CategoryRef; ids: string[] }[]; explore: string[];
};

export const PER_SHOP = 2;
const RAIL = 12;
const MIN_RAIL = 4; // hide a section rather than show a thin one
const FRESH_DAYS = 21;
const DEAL_MIN = 0.05; // at least 5% off

// Small deterministic PRNG (mulberry32) seeded from a string, e.g. today's date.
export function seededRandom(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) { h = Math.imul(h ^ seed.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(list: T[], rand: () => number): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

// Round-robin across shops (in order of their best item), at most `perShop` each.
export function diversify<T extends { shopId: string }>(list: T[], perShop = PER_SHOP): T[] {
  const byShop = new Map<string, T[]>();
  for (const item of list) {
    const bucket = byShop.get(item.shopId) ?? [];
    if (bucket.length < perShop) bucket.push(item);
    byShop.set(item.shopId, bucket);
  }
  const shops = [...byShop.values()];
  const out: T[] = [];
  for (let round = 0; round < perShop; round++) for (const bucket of shops) if (bucket[round]) out.push(bucket[round]);
  return out;
}

const discount = (c: Candidate) => (c.price != null && c.oldPrice != null && c.oldPrice > c.price ? (c.oldPrice - c.price) / c.oldPrice : 0);

export function buildHomeFeed(input: { candidates: Candidate[]; categories: CategoryRef[]; seed: string; now: number }): HomeFeed {
  const rand = seededRandom(input.seed);
  const used = new Set<string>();
  // Shuffle first so ties (and equal-score items) rotate daily; stable sorts keep that order.
  const pool = shuffle(input.candidates, rand);
  const take = (list: Candidate[], limit = RAIL, min = MIN_RAIL, perShop = PER_SHOP) => {
    const picked = diversify(list.filter((c) => !used.has(c.id)), perShop).slice(0, limit);
    if (picked.length < min) return [];
    picked.forEach((c) => used.add(c.id));
    return picked.map((c) => c.id);
  };

  // Admin picks are deliberate, so the per-shop cap doesn't apply to them.
  const featured = take(pool.filter((c) => c.featured), RAIL, 1, RAIL);
  const deals = take(pool.filter((c) => discount(c) >= DEAL_MIN).sort((a, b) => discount(b) - discount(a)));
  const popular = take(pool.filter((c) => c.clicks > 0).sort((a, b) => b.clicks - a.clicks));
  // Only genuinely new products; an old catalogue simply has no "New arrivals" row.
  const fresh = take(pool.filter((c) => input.now - c.createdAt <= FRESH_DAYS * 86400000).sort((a, b) => b.createdAt - a.createdAt));

  // Busiest categories (by products still available), each as its own rail.
  const counts = new Map<string, number>();
  for (const c of pool) if (c.categoryId && !used.has(c.id)) counts.set(c.categoryId, (counts.get(c.categoryId) ?? 0) + 1);
  const categoryRails = input.categories
    .filter((cat) => (counts.get(cat.id) ?? 0) >= MIN_RAIL)
    .sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0))
    .slice(0, 4)
    .map((category) => ({ category, ids: take(pool.filter((c) => c.categoryId === category.id)) }))
    .filter((r) => r.ids.length > 0);

  // Everything else. With many shops: at most PER_SHOP each. With only a few shops the cap
  // loosens so their products aren't hidden from the home page.
  const EXPLORE = 24;
  const shopsLeft = new Set(pool.filter((c) => !used.has(c.id)).map((c) => c.shopId)).size;
  const explore = take(pool, EXPLORE, 1, shopsLeft >= EXPLORE / PER_SHOP ? PER_SHOP : Math.ceil(EXPLORE / Math.max(shopsLeft, 1)));
  return { featured, deals, popular, fresh, categoryRails, explore };
}
