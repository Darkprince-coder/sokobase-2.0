// Turns the seller's product form into what save_product() stores. Pure (no database), so every
// pricing and variation rule is unit-tested. Errors name the field they belong to.
import { z } from "zod";
import { buildCombos, comboKey, comboLabel, normaliseGroups, MAX_COMBOS, type Combo } from "./variants";
import type { PriceType } from "./types";

export type ProductInput = {
  name: string;
  description?: string;
  categoryId?: string;
  subcategoryId?: string;
  badge?: string;
  images: string[];
  price?: string;
  oldPrice?: string;
  priceOnRequest: boolean;
  inStock: boolean;
  publish: boolean;
  specs: { label: string; value: string }[];
  options: { name: string; values: string[] }[];
  combos: Combo[];
  samePrice: boolean;
};

export type ProductPayload = {
  fields: {
    name: string; description: string | null; category_id: string | null; subcategory_id: string | null; badge: string | null;
    images: string[]; price: number | null; old_price: number | null; price_type: PriceType; in_stock: boolean;
    status: "draft" | "published"; specs: Record<string, string>; options: { name: string; values: string[] }[];
  };
  variants: { label: string; price: number | null; old_price: number | null; in_stock: boolean; sort_order: number; attributes: Record<string, string>; image_url: string | null }[];
};

type Result = { ok: true; payload: ProductPayload } | { ok: false; error: string; field: string };
const fail = (field: string, error: string): Result => ({ ok: false, error, field });

const uuid = z.string().uuid();
export const money = (raw: string | undefined | null): number | null | "invalid" => {
  const t = (raw ?? "").toString().replace(/[,\s]/g, "").replace(/^ksh/i, "");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 && n <= 100_000_000 ? Math.round(n * 100) / 100 : "invalid";
};

export function buildProductPayload(input: ProductInput, isOwnImage: (url: string) => boolean): Result {
  const name = input.name.replace(/\s+/g, " ").trim();
  if (name.length < 2) return fail("name", "Give the product a name (at least 2 letters).");
  if (name.length > 120) return fail("name", "Keep the name under 120 characters.");
  const description = (input.description ?? "").trim();
  if (description.length > 4000) return fail("description", "The description is too long (4000 characters max).");

  const categoryId = input.categoryId && uuid.safeParse(input.categoryId).success ? input.categoryId : null;
  const subcategoryId = input.subcategoryId && uuid.safeParse(input.subcategoryId).success ? input.subcategoryId : null;
  if (subcategoryId && !categoryId) return fail("category", "Choose a category before a subcategory.");
  const badge = ["hot", "offer", "new"].includes(input.badge ?? "") ? input.badge! : null;

  const images = input.images.filter((u) => typeof u === "string" && isOwnImage(u)).slice(0, 8);
  if (input.publish && images.length === 0) return fail("photos", "Add at least one photo before publishing (or save as a draft).");

  // ----- Base price -----
  let price: number | null = null;
  let oldPrice: number | null = null;
  if (!input.priceOnRequest) {
    const p = money(input.price);
    if (p === "invalid") return fail("price", "Enter the price as a number, e.g. 1500.");
    if (p === null) return fail("price", "Enter a price, or switch on “Price on request”.");
    price = p;
    const o = money(input.oldPrice);
    if (o === "invalid") return fail("oldPrice", "Enter the old price as a number.");
    if (o !== null && o <= p) return fail("oldPrice", "The old price must be higher than the price.");
    oldPrice = o;
  }

  // ----- Variations -----
  const groups = normaliseGroups(input.options);
  let variants: ProductPayload["variants"] = [];
  let priceType: PriceType = input.priceOnRequest ? "contact" : "fixed";
  let inStock = input.inStock;

  if (groups.length) {
    const submitted = new Map(input.combos.map((c) => [comboKey(c.attributes ?? {}, groups), c]));
    const combos = buildCombos(groups).map((c) => submitted.get(comboKey(c.attributes, groups)) ?? c);
    if (combos.length > MAX_COMBOS) return fail("options", `Too many combinations (max ${MAX_COMBOS}). Remove some sizes or colours.`);

    const rows: ProductPayload["variants"] = [];
    for (let i = 0; i < combos.length; i++) {
      const c = combos[i];
      const label = comboLabel(c.attributes, groups);
      let own: number | null = null;
      let ownOld: number | null = null;
      if (!input.samePrice && !input.priceOnRequest) {
        const p = money(c.price == null ? "" : String(c.price));
        if (p === "invalid") return fail("combos", `Check the price for ${label}.`);
        own = p;
        const o = money(c.oldPrice == null ? "" : String(c.oldPrice));
        if (o === "invalid") return fail("combos", `Check the old price for ${label}.`);
        if (o !== null && o <= (own ?? price ?? 0)) return fail("combos", `The old price for ${label} must be higher than its price.`);
        ownOld = o;
      }
      const imageUrl = c.imageUrl && isOwnImage(c.imageUrl) ? c.imageUrl : null;
      rows.push({ label, price: own, old_price: ownOld, in_stock: c.inStock !== false, sort_order: i, attributes: c.attributes, image_url: imageUrl });
    }

    // When combinations have different prices, every row gets an explicit price and the product
    // shows "From <lowest>"; otherwise rows inherit the product price.
    if (!input.samePrice && !input.priceOnRequest) {
      const effective = rows.map((r) => r.price ?? price!);
      const distinct = new Set(effective);
      if (distinct.size > 1) {
        rows.forEach((r, i) => { r.price = effective[i]; });
        // The card shows the lowest price among options in stock: the option the page opens on.
        const inStockPrices = effective.filter((_, i) => rows[i].in_stock);
        const min = Math.min(...(inStockPrices.length ? inStockPrices : effective));
        if (oldPrice !== null && oldPrice <= min) oldPrice = null;
        price = min;
        priceType = "from";
      } else {
        rows.forEach((r) => { r.price = null; r.old_price = null; });
      }
    }
    variants = rows;
    inStock = rows.some((r) => r.in_stock);
    if (input.publish && !inStock) return fail("combos", "Every option is marked out of stock. Mark at least one in stock, or save as a draft.");
  }

  const specs: Record<string, string> = {};
  for (const s of input.specs.slice(0, 30)) {
    const label = s.label.replace(/\s+/g, " ").trim().slice(0, 60);
    const value = s.value.replace(/\s+/g, " ").trim().slice(0, 200);
    if (label && value) specs[label] = value;
  }

  return {
    ok: true,
    payload: {
      fields: {
        name, description: description || null, category_id: categoryId, subcategory_id: subcategoryId, badge, images,
        price, old_price: oldPrice, price_type: priceType, in_stock: inStock, status: input.publish ? "published" : "draft",
        specs, options: groups,
      },
      variants,
    },
  };
}
