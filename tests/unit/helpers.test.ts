import { describe, expect, it, vi } from "vitest";
import { normalizeKePhone } from "@/lib/phone";
import { slugify } from "@/lib/slug";
import { discountPercent, formatKes, formatPrice } from "@/lib/format";
import { categoryNames, many, one } from "@/lib/relations";
import cloudinaryLoader from "@/lib/image-loader";
import { legacySearchTerms } from "@/lib/legacy-redirect";
import { describeAudit } from "@/lib/admin-labels";
import { generateInviteCode } from "@/lib/invites";

describe("normalizeKePhone", () => {
  it.each([
    ["0712345678", "254712345678"],
    ["0112345678", "254112345678"],
    ["+254 712 345 678", "254712345678"],
    ["254712345678", "254712345678"],
    ["712345678", "254712345678"],
    ["0712-345-678", "254712345678"],
  ])("accepts %s", (input, expected) => expect(normalizeKePhone(input)).toBe(expected));

  it.each(["", "12345", "0812345678", "07123456789", "+1 202 555 0100", "2547123456"])("rejects %s", (input) =>
    expect(normalizeKePhone(input)).toBeNull());
});

describe("slugify", () => {
  // Must always satisfy the database rule ^[a-z0-9]+(-[a-z0-9]+)*$
  const valid = /^[a-z0-9]+(-[a-z0-9]+)*$/;

  it("makes readable URL slugs", () => {
    expect(slugify("Samsung Galaxy A15 (128GB)")).toBe("samsung-galaxy-a15-128gb");
    expect(slugify("  Mama's Kitchen & Bakery!! ")).toBe("mama-s-kitchen-bakery");
    expect(slugify("Crème brûlée")).toBe("creme-brulee");
  });

  it("never ends with a dash after cutting to 40 characters", () => {
    const name = "Samsung Galaxy A15 128GB Blue Dual SIMX Extra"; // the 40-char cut lands on a dash
    const slug = slugify(name);
    expect(slug.length).toBeLessThanOrEqual(40);
    expect(slug).toMatch(valid);
  });

  it("produces valid slugs for awkward input", () => {
    for (const s of ["a - b", "---x---", "Ünïcödé Shop", "123", "x".repeat(80), "word ".repeat(20)]) {
      const slug = slugify(s);
      if (slug) expect(slug).toMatch(valid);
    }
  });
});

describe("prices", () => {
  it("formats Kenyan shillings", () => {
    expect(formatKes(1500)).toBe("KSh 1,500");
  });
  it("respects the price type", () => {
    expect(formatPrice(2500, "fixed")).toBe("KSh 2,500");
    expect(formatPrice(2500, "from")).toBe("From KSh 2,500");
    expect(formatPrice(2500, "contact")).toBe("Ask for price");
    expect(formatPrice(null, "fixed")).toBe("Ask for price");
  });
  it("computes discounts only when the old price is higher", () => {
    expect(discountPercent(750, 1000)).toBe(25);
    expect(discountPercent(1000, 1000)).toBe(0);
    expect(discountPercent(1200, 1000)).toBe(0);
    expect(discountPercent(null, 1000)).toBe(0);
    expect(discountPercent(500, null)).toBe(0);
  });
});

describe("PostgREST relation helpers", () => {
  it("handle object, array and null embeds", () => {
    expect(one({ a: 1 })).toEqual({ a: 1 });
    expect(one([{ a: 1 }, { a: 2 }])).toEqual({ a: 1 });
    expect(one(null)).toBeUndefined();
    expect(many(null)).toEqual([]);
    expect(many({ a: 1 })).toEqual([{ a: 1 }]);
  });
  it("extracts category names", () => {
    expect(categoryNames([{ categories: { name: "Fashion" } }, { categories: [{ name: "Beauty" }] }, { categories: null }])).toEqual(["Fashion", "Beauty"]);
  });
});

describe("Cloudinary image loader", () => {
  it("adds format, quality and width transforms", () => {
    expect(cloudinaryLoader({ src: "https://res.cloudinary.com/demo/image/upload/v1/shop/logo.png", width: 640 }))
      .toBe("https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_640/v1/shop/logo.png");
    expect(cloudinaryLoader({ src: "https://res.cloudinary.com/demo/image/upload/v1/a.jpg", width: 300, quality: 60 }))
      .toContain("q_60");
  });
  it("leaves other URLs untouched", () => {
    expect(cloudinaryLoader({ src: "/icons/icon-192.png", width: 192 })).toBe("/icons/icon-192.png");
  });
});

describe("own-Cloudinary image check", () => {
  it("only accepts this account's upload URLs", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME", "sokocloud");
    const { isOwnImageUrl } = await import("@/lib/cloudinary");
    expect(isOwnImageUrl("https://res.cloudinary.com/sokocloud/image/upload/v1/a.jpg")).toBe(true);
    expect(isOwnImageUrl("https://res.cloudinary.com/someoneelse/image/upload/v1/a.jpg")).toBe(false);
    expect(isOwnImageUrl("https://evil.example/https://res.cloudinary.com/sokocloud/image/upload/a.jpg")).toBe(false);
    expect(isOwnImageUrl("javascript:alert(1)")).toBe(false);
    vi.unstubAllEnvs();
  });
});

describe("legacy URL search terms", () => {
  it("keeps numbers and the first four words", () => {
    expect(legacySearchTerms("3-by-6-mattress")).toBe("3 by 6 mattress");
    expect(legacySearchTerms("ailipu-kl-6301ad-31ch-woofer-subwoofer")).toBe("ailipu kl 6301ad 31ch");
    expect(legacySearchTerms("Sofa-Set<script>")).toBe("sofa setscript");
    expect(legacySearchTerms("")).toBe("");
  });
});

describe("admin audit descriptions", () => {
  it("describes renewals with amount and code", () => {
    expect(describeAudit("subscription.renew", { amount_kes: 1000, duration_days: 30, payment_note: "QAB12CD" }))
      .toBe("Recorded a subscription payment (KSh 1,000, 30 days, QAB12CD)");
  });
  it("falls back to the raw action name", () => {
    expect(describeAudit("something.new")).toBe("something.new");
  });
});

describe("invite codes", () => {
  it("match the database format and avoid look-alike characters", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateInviteCode();
      expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
      expect(code).not.toMatch(/[01OIL]/);
    }
  });
});
