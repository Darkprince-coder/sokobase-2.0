import { describe, expect, it } from "vitest";
import {
  buildCombos, comboCount, comboLabel, defaultSelection, findVariant, groupsForDisplay, normaliseGroups, priceRange, valueState, MAX_COMBOS,
  type PublicVariant,
} from "@/lib/variants";

const colourSize = [{ name: "Colour", values: ["Red", "Blue"] }, { name: "Size", values: ["S", "M", "L"] }];

describe("normaliseGroups", () => {
  it("trims, drops blanks and duplicates, caps at two groups", () => {
    expect(normaliseGroups([
      { name: " Colour ", values: ["Red", " red ", "", "Blue  "] },
      { name: "colour", values: ["Green"] },
      { name: "Size", values: ["S"] },
      { name: "Extra", values: ["x"] },
    ])).toEqual([{ name: "Colour", values: ["Red", "Blue"] }, { name: "Size", values: ["S"] }]);
  });
  it("drops groups with no values", () => {
    expect(normaliseGroups([{ name: "Size", values: [" "] }])).toEqual([]);
  });
});

describe("buildCombos", () => {
  it("makes every combination in order", () => {
    const combos = buildCombos(colourSize);
    expect(combos).toHaveLength(6);
    expect(combos.map((c) => comboLabel(c.attributes, colourSize))).toEqual(["Red / S", "Red / M", "Red / L", "Blue / S", "Blue / M", "Blue / L"]);
    expect(comboCount(colourSize)).toBe(6);
  });
  it("keeps settings of combinations that still exist", () => {
    const first = buildCombos(colourSize).map((c) => (c.attributes.Colour === "Red" && c.attributes.Size === "M" ? { ...c, price: 1500, inStock: false } : c));
    const next = buildCombos([colourSize[0], { name: "Size", values: ["M", "XL"] }], first);
    const redM = next.find((c) => c.attributes.Colour === "Red" && c.attributes.Size === "M");
    expect(redM).toMatchObject({ price: 1500, inStock: false });
    expect(next.find((c) => c.attributes.Size === "XL")).toMatchObject({ price: null, inStock: true });
  });
  it("never exceeds the maximum", () => {
    const big = [{ name: "A", values: Array.from({ length: 20 }, (_, i) => `a${i}`) }, { name: "B", values: Array.from({ length: 20 }, (_, i) => `b${i}`) }];
    expect(buildCombos(big)).toHaveLength(MAX_COMBOS);
  });
  it("returns nothing without groups", () => {
    expect(buildCombos([])).toEqual([]);
  });
});

describe("product page selection", () => {
  const v = (id: string, Colour: string, Size: string, inStock = true, price: number | null = null): PublicVariant =>
    ({ id, label: `${Colour} / ${Size}`, attributes: { Colour, Size }, price, oldPrice: null, inStock, imageUrl: null });
  const variants = [v("1", "Red", "S"), v("2", "Red", "M", false), v("3", "Blue", "S", true, 1800)];

  it("finds the chosen combination", () => {
    expect(findVariant(variants, { Colour: "Blue", Size: "S" }, colourSize)?.id).toBe("3");
    expect(findVariant(variants, { Colour: "Blue" }, colourSize)).toBeNull();
  });
  it("marks values that are out of stock or do not exist", () => {
    expect(valueState(variants, colourSize, { Colour: "Red" }, "Size", "S")).toBe("ok");
    expect(valueState(variants, colourSize, { Colour: "Red" }, "Size", "M")).toBe("out");
    expect(valueState(variants, colourSize, { Colour: "Blue" }, "Size", "M")).toBe("none");
  });
  it("computes the price range with fallback to the product price", () => {
    expect(priceRange(1500, variants)).toEqual({ min: 1500, max: 1800 });
    expect(priceRange(null, [])).toEqual({ min: null, max: null });
  });
  it("shows old-style variants as one Option group", () => {
    const old: PublicVariant[] = [{ id: "a", label: "5 by 6", attributes: {}, price: 2500, oldPrice: null, inStock: true, imageUrl: null }];
    const { groups, variants: shown } = groupsForDisplay([], old);
    expect(groups).toEqual([{ name: "Option", values: ["5 by 6"] }]);
    expect(shown[0].attributes).toEqual({ Option: "5 by 6" });
  });
});

describe("defaultSelection", () => {
  const groups = [{ name: "Size", values: ["S", "M", "L"] }];
  const pv = (Size: string, price: number | null, inStock = true): PublicVariant =>
    ({ id: Size, label: Size, attributes: { Size }, price, oldPrice: null, inStock, imageUrl: null });

  it("opens on the cheapest option in stock, so the card price matches", () => {
    expect(defaultSelection(groups, [pv("S", 350), pv("M", 200), pv("L", 400)], 500)).toEqual({ Size: "M" });
  });
  it("skips sold-out options", () => {
    expect(defaultSelection(groups, [pv("S", 100, false), pv("M", 200), pv("L", 400)], null)).toEqual({ Size: "M" });
  });
  it("uses the seller's order when prices are equal (or inherited)", () => {
    expect(defaultSelection(groups, [pv("S", null), pv("M", null)], 900)).toEqual({ Size: "S" });
  });
  it("falls back to the cheapest option when everything is sold out", () => {
    expect(defaultSelection(groups, [pv("S", 300, false), pv("M", 100, false)], null)).toEqual({ Size: "M" });
  });
  it("returns nothing without options", () => {
    expect(defaultSelection([], [], 100)).toEqual({});
  });
});
