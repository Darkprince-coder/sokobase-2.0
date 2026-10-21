import { describe, expect, it } from "vitest";
import { classifySource } from "@/lib/insights-source";
import { addDays, change, nairobiToday } from "@/lib/insights";

describe("classifySource", () => {
  it("treats no referrer as direct (WhatsApp/SMS links, typed, bookmarks)", () => {
    expect(classifySource({})).toBe("direct");
    expect(classifySource({ referrer: "" })).toBe("direct");
    expect(classifySource({ referrer: "not a url" })).toBe("direct");
  });
  it("counts later pages in the same visit as browsing SokoBase", () => {
    expect(classifySource({ internal: true, referrer: "https://www.google.com/" })).toBe("sokobase");
  });
  it("recognises search engines, social networks and WhatsApp", () => {
    expect(classifySource({ referrer: "https://www.google.co.ke/" })).toBe("google");
    expect(classifySource({ referrer: "https://www.bing.com/search?q=x" })).toBe("google");
    expect(classifySource({ referrer: "https://l.instagram.com/" })).toBe("social");
    expect(classifySource({ referrer: "https://m.facebook.com/" })).toBe("social");
    expect(classifySource({ referrer: "https://www.tiktok.com/" })).toBe("social");
    expect(classifySource({ referrer: "https://web.whatsapp.com/" })).toBe("whatsapp");
    expect(classifySource({ referrer: "https://sokobase.co.ke/products" })).toBe("sokobase");
    expect(classifySource({ referrer: "https://example.com/" })).toBe("other");
  });
  it("does not mistake look-alike domains", () => {
    expect(classifySource({ referrer: "https://notgoogle.com/" })).toBe("other");
    expect(classifySource({ referrer: "https://fakesokobase.co.ke/" })).toBe("other");
  });
  it("trusts only known share tags", () => {
    expect(classifySource({ src: "whatsapp" })).toBe("whatsapp");
    expect(classifySource({ src: "Instagram" })).toBe("social");
    expect(classifySource({ src: "<script>" })).toBe("direct");
  });
});

describe("insight dates and changes", () => {
  it("uses Nairobi dates (UTC+3)", () => {
    expect(nairobiToday(new Date("2026-10-20T22:30:00Z"))).toBe("2026-10-21");
    expect(nairobiToday(new Date("2026-10-20T20:30:00Z"))).toBe("2026-10-20");
  });
  it("adds days across months", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
  it("computes percentage change", () => {
    expect(change(15, 10)).toBe(50);
    expect(change(5, 10)).toBe(-50);
    expect(change(0, 0)).toBe(0);
    expect(change(3, 0)).toBeNull();
  });
});
