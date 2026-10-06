import { describe, expect, it } from "vitest";
import { buildHomeFeed, diversify, seededRandom, shuffle, type Candidate } from "@/lib/home-feed";

const NOW = Date.UTC(2026, 9, 6);
const DAY = 86400000;
let n = 0;
const item = (p: Partial<Candidate> = {}): Candidate => ({
  id: `p${++n}`, shopId: "s1", categoryId: "c1", createdAt: NOW - 60 * DAY, price: 1000, oldPrice: null, featured: false, clicks: 0, ...p,
});
const cats = [{ id: "c1", slug: "fashion", name: "Fashion" }, { id: "c2", slug: "phones", name: "Phones" }];
const all = (f: ReturnType<typeof buildHomeFeed>) => [...f.featured, ...f.deals, ...f.popular, ...f.fresh, ...f.categoryRails.flatMap((r) => r.ids), ...f.explore];

describe("diversify", () => {
  it("interleaves shops and caps each shop", () => {
    const list = [{ id: 1, shopId: "a" }, { id: 2, shopId: "a" }, { id: 3, shopId: "a" }, { id: 4, shopId: "b" }, { id: 5, shopId: "c" }, { id: 6, shopId: "b" }];
    expect(diversify(list, 2).map((x) => x.id)).toEqual([1, 4, 5, 2, 6]);
  });
});

describe("seeded shuffle", () => {
  it("is the same for the same day and differs between days", () => {
    const list = Array.from({ length: 20 }, (_, i) => i);
    expect(shuffle(list, seededRandom("2026-10-06"))).toEqual(shuffle(list, seededRandom("2026-10-06")));
    expect(shuffle(list, seededRandom("2026-10-06"))).not.toEqual(shuffle(list, seededRandom("2026-10-07")));
  });
});

describe("buildHomeFeed", () => {
  it("never lets one shop dominate a section", () => {
    const candidates = [
      ...Array.from({ length: 30 }, () => item({ shopId: "big", oldPrice: 2000, createdAt: NOW - DAY })),
      ...["a", "b", "c", "d"].map((s) => item({ shopId: s, oldPrice: 1500, createdAt: NOW - 2 * DAY })),
    ];
    const feed = buildHomeFeed({ candidates, categories: cats, seed: "x", now: NOW });
    const shopOf = (id: string) => candidates.find((c) => c.id === id)!.shopId;
    for (const section of [feed.deals, feed.fresh]) {
      expect(section.filter((id) => shopOf(id) === "big").length).toBeLessThanOrEqual(2);
    }
  });

  it("caps shops in More to explore once there are many shops", () => {
    const candidates = [
      ...Array.from({ length: 20 }, () => item({ shopId: "big" })),
      ...Array.from({ length: 14 }, (_, i) => item({ shopId: `s${i}` })),
    ];
    const feed = buildHomeFeed({ candidates, categories: [], seed: "x", now: NOW });
    expect(feed.explore.filter((id) => candidates.find((c) => c.id === id)!.shopId === "big").length).toBeLessThanOrEqual(2);
  });

  it("doesn't hide products when there are only a few shops", () => {
    const candidates = [...Array.from({ length: 5 }, () => item({ shopId: "only" })), item({ shopId: "other" })];
    expect(buildHomeFeed({ candidates, categories: [], seed: "x", now: NOW }).explore).toHaveLength(6);
  });

  it("shows every featured product, even from one shop", () => {
    const candidates = Array.from({ length: 4 }, () => item({ shopId: "one", featured: true }));
    expect(buildHomeFeed({ candidates, categories: [], seed: "x", now: NOW }).featured).toHaveLength(4);
  });

  it("shows each product at most once on the page", () => {
    const candidates = Array.from({ length: 60 }, (_, i) => item({ shopId: `s${i % 12}`, oldPrice: i % 2 ? 1500 : null, clicks: i % 3, createdAt: NOW - i * DAY, categoryId: i % 2 ? "c1" : "c2" }));
    const ids = all(buildHomeFeed({ candidates, categories: cats, seed: "x", now: NOW }));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("deals are real discounts, biggest first", () => {
    const candidates = [
      ...["a", "b", "c", "d", "e"].map((s, i) => item({ shopId: s, price: 1000, oldPrice: 1100 + i * 200 })),
      item({ shopId: "f", price: 1000, oldPrice: null }),
      item({ shopId: "g", price: 1000, oldPrice: 1020 }), // 2%: not a deal
    ];
    const feed = buildHomeFeed({ candidates, categories: cats, seed: "x", now: NOW });
    const off = (id: string) => { const c = candidates.find((x) => x.id === id)!; return (c.oldPrice! - c.price!) / c.oldPrice!; };
    expect(feed.deals).toHaveLength(5);
    expect(feed.deals.map(off)).toEqual([...feed.deals.map(off)].sort((a, b) => b - a));
  });

  it("popular comes from WhatsApp taps", () => {
    const candidates = ["a", "b", "c", "d", "e"].map((s, i) => item({ shopId: s, clicks: i }));
    const feed = buildHomeFeed({ candidates, categories: cats, seed: "x", now: NOW });
    expect(feed.popular).toHaveLength(4);
    expect(feed.popular[0]).toBe(candidates[4].id);
  });

  it("hides thin sections but still shows a tiny catalogue", () => {
    const candidates = [item({ shopId: "a" }), item({ shopId: "b", oldPrice: 2000 })];
    const feed = buildHomeFeed({ candidates, categories: cats, seed: "x", now: NOW });
    expect(feed.deals).toEqual([]);
    expect(feed.categoryRails).toEqual([]);
    expect(feed.explore).toHaveLength(2);
  });

  it("puts featured products first, even just one", () => {
    const candidates = [item({ shopId: "a", featured: true }), ...["b", "c", "d"].map((s) => item({ shopId: s }))];
    expect(buildHomeFeed({ candidates, categories: cats, seed: "x", now: NOW }).featured).toEqual([candidates[0].id]);
  });

  it("builds rails for the busiest categories", () => {
    const candidates = [
      ...Array.from({ length: 8 }, (_, i) => item({ shopId: `f${i}`, categoryId: "c1" })),
      ...Array.from({ length: 5 }, (_, i) => item({ shopId: `p${i}`, categoryId: "c2" })),
    ];
    const rails = buildHomeFeed({ candidates, categories: cats, seed: "x", now: NOW }).categoryRails;
    expect(rails.map((r) => r.category.slug)).toContain("fashion");
  });
});
