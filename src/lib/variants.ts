// Product variations shared by the seller form, the server action and the product page.
// A product has up to 2 option groups (e.g. Colour, Size). Every combination of their values is a
// variant with its own stock, an optional own price, and an optional photo.

export type OptionGroup = { name: string; values: string[] };
export type Attributes = Record<string, string>;
export type Combo = {
  attributes: Attributes;
  price: number | null; // null = same as the product price
  oldPrice: number | null;
  inStock: boolean;
  imageUrl: string | null;
};

export const MAX_GROUPS = 2;
export const MAX_VALUES = 25;
export const MAX_COMBOS = 50;

// Quick picks for the seller form. Free text is always allowed too.
export const OPTION_PRESETS: { name: string; values: string[] }[] = [
  { name: "Colour", values: ["Black", "White", "Grey", "Red", "Blue", "Green", "Brown", "Pink", "Beige"] },
  { name: "Size", values: ["XS", "S", "M", "L", "XL", "XXL"] },
  { name: "Shoe size", values: ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45"] },
  { name: "Weight", values: ["250g", "500g", "1kg", "2kg", "5kg"] },
  { name: "Volume", values: ["250ml", "500ml", "1L", "2L", "5L"] },
  { name: "Storage", values: ["64GB", "128GB", "256GB", "512GB"] },
  { name: "Type", values: [] },
];

// Common colour names mapped to swatch colours on the product page (others show as text chips).
export const SWATCHES: Record<string, string> = {
  black: "#1c1c1c", white: "#ffffff", grey: "#9aa0a6", gray: "#9aa0a6", silver: "#c0c4c8", gold: "#c9a227",
  red: "#d32f2f", maroon: "#7b1f2a", pink: "#f06292", purple: "#7e57c2", blue: "#1e63d6", navy: "#1f2a5a",
  green: "#2e7d32", olive: "#708238", yellow: "#f4c20d", orange: "#f57c00", brown: "#795548", beige: "#e8dcc3", cream: "#f5efe0",
};
export const isColourGroup = (name: string) => /colou?r/i.test(name);
export const swatchFor = (value: string) => SWATCHES[value.trim().toLowerCase()] ?? null;

const clean = (s: string) => s.replace(/\s+/g, " ").trim();

// Tidy groups: trimmed names/values, no blanks or duplicates, at most MAX_GROUPS.
export function normaliseGroups(groups: OptionGroup[]): OptionGroup[] {
  const seenNames = new Set<string>();
  const out: OptionGroup[] = [];
  for (const g of groups) {
    const name = clean(g.name).slice(0, 30);
    if (!name || seenNames.has(name.toLowerCase())) continue;
    const seen = new Set<string>();
    const values = g.values.map((v) => clean(v).slice(0, 30)).filter((v) => v && !seen.has(v.toLowerCase()) && seen.add(v.toLowerCase())).slice(0, MAX_VALUES);
    if (!values.length) continue;
    seenNames.add(name.toLowerCase());
    out.push({ name, values });
    if (out.length === MAX_GROUPS) break;
  }
  return out;
}

export const comboKey = (attrs: Attributes, groups: OptionGroup[]) => groups.map((g) => `${g.name}=${attrs[g.name] ?? ""}`).join("|");
export const comboLabel = (attrs: Attributes, groups: OptionGroup[]) => groups.map((g) => attrs[g.name]).filter(Boolean).join(" / ");

// Every combination of the groups' values, keeping settings (price, stock, photo) of combinations
// that already existed, so editing a list of sizes never wipes what the seller entered.
export function buildCombos(groups: OptionGroup[], existing: Combo[] = []): Combo[] {
  if (!groups.length) return [];
  const previous = new Map(existing.map((c) => [comboKey(c.attributes, groups), c]));
  let rows: Attributes[] = [{}];
  for (const g of groups) rows = rows.flatMap((attrs) => g.values.map((v) => ({ ...attrs, [g.name]: v })));
  return rows.slice(0, MAX_COMBOS).map((attributes) => {
    const prev = previous.get(comboKey(attributes, groups));
    return prev ? { ...prev, attributes } : { attributes, price: null, oldPrice: null, inStock: true, imageUrl: null };
  });
}

export const comboCount = (groups: OptionGroup[]) => groups.reduce((n, g) => n * Math.max(g.values.length, 1), groups.length ? 1 : 0);

// ---------- Product page ----------
export type PublicVariant = { id: string; label: string; attributes: Attributes; price: number | null; oldPrice: number | null; inStock: boolean; imageUrl: string | null };

// Older products have variants without attributes: present them as one "Option" group.
export function groupsForDisplay(options: OptionGroup[], variants: PublicVariant[]): { groups: OptionGroup[]; variants: PublicVariant[] } {
  if (options.length) return { groups: options, variants };
  if (!variants.length) return { groups: [], variants };
  const groups = [{ name: "Option", values: variants.map((v) => v.label) }];
  return { groups, variants: variants.map((v) => ({ ...v, attributes: { Option: v.label } })) };
}

export const findVariant = (variants: PublicVariant[], selection: Attributes, groups: OptionGroup[]) =>
  groups.every((g) => selection[g.name]) ? variants.find((v) => groups.every((g) => v.attributes[g.name] === selection[g.name])) ?? null : null;

// Is this value choosable given the other current selections (exists and in stock in some combo)?
export function valueState(variants: PublicVariant[], groups: OptionGroup[], selection: Attributes, group: string, value: string): "ok" | "out" | "none" {
  const others = groups.filter((g) => g.name !== group && selection[g.name]);
  const matches = variants.filter((v) => v.attributes[group] === value && others.every((g) => v.attributes[g.name] === selection[g.name]));
  if (!matches.length) return "none";
  return matches.some((v) => v.inStock) ? "ok" : "out";
}

// The combination a product page opens with: the cheapest one in stock (ties: the seller's order),
// so the price on the product card is exactly the price the customer sees first. If everything is
// sold out, the first combination. Returns {} when there are no options.
export function defaultSelection(groups: OptionGroup[], variants: PublicVariant[], basePrice: number | null): Attributes {
  if (!groups.length || !variants.length) return {};
  const pool = variants.some((v) => v.inStock) ? variants.filter((v) => v.inStock) : variants;
  let best = pool[0];
  for (const v of pool) if ((v.price ?? basePrice ?? Infinity) < (best.price ?? basePrice ?? Infinity)) best = v;
  return Object.fromEntries(groups.map((g) => [g.name, best.attributes[g.name]]).filter(([, value]) => value));
}

// Photos can be linked to the values of the first option group, whatever it is (Colour, Type...).
export const photoGroupOf = (groups: OptionGroup[]) => groups[0] ?? null;

// Lowest and highest price across combinations (falling back to the product price).
export function priceRange(basePrice: number | null, variants: { price: number | null }[]) {
  const prices = variants.map((v) => v.price ?? basePrice).filter((p): p is number => p != null);
  if (!prices.length) return { min: basePrice, max: basePrice };
  return { min: Math.min(...prices), max: Math.max(...prices) };
}
