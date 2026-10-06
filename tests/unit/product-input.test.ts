import { describe, expect, it } from "vitest";
import { buildProductPayload, money, type ProductInput } from "@/lib/product-input";

const own = (u: string) => u.startsWith("https://res.cloudinary.com/soko/");
const PHOTO = "https://res.cloudinary.com/soko/image/upload/v1/a.jpg";
const base: ProductInput = {
  name: "Cotton T-shirt", images: [PHOTO], price: "1,200", priceOnRequest: false, inStock: true, publish: true,
  specs: [], options: [], combos: [], samePrice: true,
};
const ok = (input: Partial<ProductInput>) => {
  const r = buildProductPayload({ ...base, ...input }, own);
  if (!r.ok) throw new Error(`${r.field}: ${r.error}`);
  return r.payload;
};
const err = (input: Partial<ProductInput>) => {
  const r = buildProductPayload({ ...base, ...input }, own);
  if (r.ok) throw new Error("expected an error");
  return r;
};

describe("money", () => {
  it("accepts friendly formats", () => {
    expect(money("1,500")).toBe(1500);
    expect(money(" KSh 2 000 ")).toBe(2000);
    expect(money("")).toBeNull();
    expect(money("abc")).toBe("invalid");
    expect(money("-5")).toBe("invalid");
  });
});

describe("simple products", () => {
  it("builds a fixed-price product", () => {
    const p = ok({});
    expect(p.fields).toMatchObject({ name: "Cotton T-shirt", price: 1200, price_type: "fixed", status: "published", in_stock: true });
    expect(p.variants).toEqual([]);
  });
  it("supports price on request", () => {
    expect(ok({ priceOnRequest: true, price: "" }).fields).toMatchObject({ price: null, price_type: "contact" });
  });
  it("checks the discount", () => {
    expect(ok({ oldPrice: "1500" }).fields.old_price).toBe(1500);
    expect(err({ oldPrice: "1000" }).field).toBe("oldPrice");
  });
  it("points to the field that needs fixing", () => {
    expect(err({ name: "x" }).field).toBe("name");
    expect(err({ price: "" }).field).toBe("price");
    expect(err({ price: "12abc" }).field).toBe("price");
    expect(err({ images: [] }).field).toBe("photos");
  });
  it("allows a draft without photos", () => {
    expect(ok({ images: [], publish: false }).fields.status).toBe("draft");
  });
  it("drops photos from other hosts and keeps at most 8", () => {
    const photos = [...Array(10)].map((_, i) => `https://res.cloudinary.com/soko/image/upload/v1/${i}.jpg`);
    expect(ok({ images: ["https://evil.example/x.jpg", ...photos] }).fields.images).toHaveLength(8);
  });
  it("turns spec rows into a map, skipping blanks", () => {
    expect(ok({ specs: [{ label: "Material", value: "Cotton" }, { label: "", value: "x" }, { label: "Fit", value: " " }] }).fields.specs).toEqual({ Material: "Cotton" });
  });
});

describe("variations", () => {
  const options = [{ name: "Colour", values: ["Red", "Blue"] }, { name: "Size", values: ["M", "L"] }];

  it("same price for all: rows inherit the product price", () => {
    const p = ok({ options });
    expect(p.variants).toHaveLength(4);
    expect(p.variants.map((v) => v.label)).toEqual(["Red / M", "Red / L", "Blue / M", "Blue / L"]);
    expect(p.variants.every((v) => v.price === null)).toBe(true);
    expect(p.fields).toMatchObject({ price_type: "fixed", price: 1200, options });
  });

  it("different prices: explicit price per row and a 'from' price", () => {
    const p = ok({ options, samePrice: false, combos: [{ attributes: { Colour: "Blue", Size: "L" }, price: 1500, oldPrice: null, inStock: true, imageUrl: null }] });
    expect(p.fields).toMatchObject({ price_type: "from", price: 1200 });
    expect(p.variants.find((v) => v.label === "Blue / L")?.price).toBe(1500);
    expect(p.variants.find((v) => v.label === "Red / M")?.price).toBe(1200);
  });

  it("price switched to 'differs' but all equal stays fixed", () => {
    const p = ok({ options, samePrice: false });
    expect(p.fields.price_type).toBe("fixed");
    expect(p.variants.every((v) => v.price === null)).toBe(true);
  });

  it("stock per combination; product is in stock if any combination is", () => {
    const combos = [{ attributes: { Colour: "Red", Size: "M" }, price: null, oldPrice: null, inStock: false, imageUrl: null }];
    const p = ok({ options, combos });
    expect(p.variants.find((v) => v.label === "Red / M")?.in_stock).toBe(false);
    expect(p.fields.in_stock).toBe(true);
  });

  it("refuses to publish when every combination is out of stock", () => {
    const combos = ["Red", "Blue"].flatMap((Colour) => ["M", "L"].map((Size) => ({ attributes: { Colour, Size }, price: null, oldPrice: null, inStock: false, imageUrl: null })));
    expect(err({ options, combos }).field).toBe("combos");
  });

  it("keeps per-colour photos only from our own storage", () => {
    const combos = [
      { attributes: { Colour: "Red", Size: "M" }, price: null, oldPrice: null, inStock: true, imageUrl: PHOTO },
      { attributes: { Colour: "Red", Size: "L" }, price: null, oldPrice: null, inStock: true, imageUrl: "https://evil.example/r.jpg" },
    ];
    const p = ok({ options, combos });
    expect(p.variants.find((v) => v.label === "Red / M")?.image_url).toBe(PHOTO);
    expect(p.variants.find((v) => v.label === "Red / L")?.image_url).toBeNull();
  });

  it("ignores submitted combinations that no longer match the options", () => {
    const combos = [{ attributes: { Colour: "Green", Size: "M" }, price: 9, oldPrice: null, inStock: true, imageUrl: null }];
    expect(ok({ options, combos }).variants.map((v) => v.label)).not.toContain("Green / M");
  });
});
