"use client";
import { useActionState, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, Plus, Trash2 } from "lucide-react";
import ProductImages from "./ProductImages";
import OptionsEditor, { type ComboOverride } from "./OptionsEditor";
import { saveProduct } from "@/app/dashboard/actions";
import { buildCombos, comboKey, normaliseGroups, photoGroupOf, type Combo, type OptionGroup } from "@/lib/variants";
import type { ActionState } from "@/lib/action-state";
import { site } from "@/lib/site";
import styles from "./ProductForm.module.css";

type Category = { id: string; name: string };
type Subcategory = { id: string; name: string; category_id: string };
type Variant = { id: string; label: string; price: number | null; oldPrice: number | null; inStock: boolean; attributes: Record<string, string>; imageUrl: string | null };
export type EditableProduct = {
  id: string; name: string; description: string | null; category_id: string | null; subcategory_id?: string | null;
  price: number | null; old_price: number | null; price_type: "fixed" | "from" | "contact";
  badge: "hot" | "offer" | "new" | null; images: string[]; in_stock: boolean; status: "draft" | "published";
  specs: Record<string, string>; options: OptionGroup[]; variants: Variant[];
};

const str = (n: number | null | undefined) => (n == null ? "" : String(n));

// Initial option state, including older products whose options were a single plain list.
function initialOptions(product?: EditableProduct) {
  if (!product?.variants.length) return { groups: product?.options ?? [], overrides: {}, colourPhotos: {}, samePrice: !!product };
  const legacy = !product.options.length;
  const groups = legacy ? [{ name: "Option", values: product.variants.map((v) => v.label) }] : product.options;
  const overrides: Record<string, ComboOverride> = {};
  const colourPhotos: Record<string, string> = {};
  const colour = photoGroupOf(groups); // photos belong to the first option group
  for (const v of product.variants) {
    const attrs = legacy ? { Option: v.label } : v.attributes;
    overrides[comboKey(attrs, groups)] = { price: str(v.price), oldPrice: str(v.oldPrice), inStock: v.inStock };
    if (colour && v.imageUrl && attrs[colour.name]) colourPhotos[attrs[colour.name]] = v.imageUrl;
  }
  return { groups, overrides, colourPhotos, samePrice: product.variants.every((v) => v.price == null) };
}

export default function ProductForm({ product, categories, subcategories, remaining }: { product?: EditableProduct; categories: Category[]; subcategories: Subcategory[]; remaining: number | null }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveProduct, {});
  const init = useMemo(() => initialOptions(product), [product]);

  const [images, setImages] = useState<string[]>(product?.images ?? []);
  // For "From" products the stored price is already the lowest combination price.
  const [price, setPrice] = useState(str(product?.price));
  const [oldPrice, setOldPrice] = useState(str(product?.old_price));
  const [showDiscount, setShowDiscount] = useState(!!product?.old_price);
  const [onRequest, setOnRequest] = useState(product?.price_type === "contact");
  const [inStock, setInStock] = useState(product?.in_stock ?? true);
  const [hasOptions, setHasOptions] = useState(init.groups.length > 0);
  const [groups, setGroups] = useState<OptionGroup[]>(init.groups);
  const [overrides, setOverrides] = useState<Record<string, ComboOverride>>(init.overrides);
  const [colourPhotos, setColourPhotos] = useState<Record<string, string>>(init.colourPhotos);
  const [samePrice, setSamePrice] = useState(init.samePrice);
  const [categoryId, setCategoryId] = useState(product?.category_id ?? "");
  const [specs, setSpecs] = useState<{ label: string; value: string }[]>(
    Object.entries(product?.specs ?? {}).map(([label, value]) => ({ label, value })),
  );
  const [moreOpen, setMoreOpen] = useState(!!(product?.description || product?.category_id || Object.keys(product?.specs ?? {}).length));

  const cleanGroups = useMemo(() => (hasOptions ? normaliseGroups(groups) : []), [groups, hasOptions]);
  const colourGroup = photoGroupOf(cleanGroups);
  const keyOf = (c: Combo) => comboKey(c.attributes, cleanGroups);
  const combos: Combo[] = useMemo(() => buildCombos(cleanGroups).map((c) => {
    const o = overrides[comboKey(c.attributes, cleanGroups)];
    return {
      attributes: c.attributes,
      price: o?.price ? Number(o.price.replace(/[,\s]/g, "")) : null,
      oldPrice: o?.oldPrice ? Number(o.oldPrice.replace(/[,\s]/g, "")) : null,
      inStock: o?.inStock ?? true,
      imageUrl: colourGroup ? colourPhotos[c.attributes[colourGroup.name]] ?? null : null,
    };
  }), [cleanGroups, overrides, colourPhotos, colourGroup]);

  const subcatOptions = useMemo(() => subcategories.filter((s) => s.category_id === categoryId), [subcategories, categoryId]);
  const fieldError = (f: string) => (state.field === f ? state.error : undefined);

  // Bring the first problem into view after a failed save.
  useEffect(() => {
    if (!state.error) return;
    const target = document.getElementById(state.field ? `f-${state.field}` : "f-top");
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [state]);
  // "More details" opens by itself when the problem is inside it.
  const detailsOpen = moreOpen || (!!state.field && ["category", "description"].includes(state.field));

  if (!product && remaining !== null && remaining <= 0) {
    return (
      <div className={styles.blocked}>
        You have reached your plan&apos;s product limit. Delete a product, or contact SokoBase on WhatsApp to upgrade{site.supportWhatsapp ? "" : " your plan"}.
      </div>
    );
  }

  return (
    <form action={action} className={styles.form} noValidate>
      <span id="f-top" />
      {product && <input type="hidden" name="id" value={product.id} />}
      <input type="hidden" name="images" value={JSON.stringify(images)} />
      <input type="hidden" name="price_on_request" value={onRequest ? "1" : "0"} />
      <input type="hidden" name="in_stock" value={inStock ? "1" : "0"} />
      <input type="hidden" name="options" value={JSON.stringify(cleanGroups)} />
      <input type="hidden" name="combos" value={JSON.stringify(combos)} />
      <input type="hidden" name="same_price" value={samePrice ? "1" : "0"} />
      <input type="hidden" name="specs" value={JSON.stringify(specs)} />

      {state.ok && state.message && <p className={styles.success} role="status"><CheckCircle2 size={18} aria-hidden="true" /> {state.message}</p>}

      <section className={styles.step} id="f-photos">
        <h2><span className={styles.num}>1</span> Photos</h2>
        <ProductImages value={images} onChange={setImages} />
        {fieldError("photos") && <p role="alert" className={styles.fieldError}>{fieldError("photos")}</p>}
      </section>

      <section className={styles.step}>
        <h2><span className={styles.num}>2</span> Name and price</h2>
        <label className={styles.field} id="f-name">
          <span>Product name</span>
          <input name="name" defaultValue={product?.name} maxLength={120} placeholder="e.g. Ladies leather handbag" autoComplete="off" aria-invalid={!!fieldError("name")} />
          {fieldError("name") && <em role="alert" className={styles.fieldError}>{fieldError("name")}</em>}
        </label>

        {!onRequest && (
          <div className={styles.priceRow}>
            <label className={styles.field} id="f-price">
              <span>{hasOptions && !samePrice ? "Main price (KSh)" : "Price (KSh)"}</span>
              <div className={styles.money}><em>KSh</em><input name="price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="1500" aria-invalid={!!fieldError("price")} /></div>
              {hasOptions && !samePrice && <span className={styles.hint}>Used for any option you leave without its own price.</span>}
              {fieldError("price") && <em role="alert" className={styles.fieldError}>{fieldError("price")}</em>}
            </label>
            {showDiscount && (
              <label className={styles.field} id="f-oldPrice">
                <span>Was (old price)</span>
                <div className={styles.money}><em>KSh</em><input name="old_price" inputMode="decimal" value={oldPrice} onChange={(e) => setOldPrice(e.target.value)} placeholder="2000" aria-invalid={!!fieldError("oldPrice")} /></div>
                {fieldError("oldPrice") && <em role="alert" className={styles.fieldError}>{fieldError("oldPrice")}</em>}
              </label>
            )}
          </div>
        )}
        {!showDiscount && !onRequest && <button type="button" className={styles.linkBtn} onClick={() => setShowDiscount(true)}>+ Add a discount (show old price crossed out)</button>}
        {showDiscount && !onRequest && <button type="button" className={styles.linkBtn} onClick={() => { setShowDiscount(false); setOldPrice(""); }}>Remove discount</button>}

        <label className={styles.switchRow}>
          <input type="checkbox" checked={onRequest} onChange={(e) => setOnRequest(e.target.checked)} />
          <span><strong>Price on request</strong><small>Customers ask for the price on WhatsApp (e.g. services, custom orders).</small></span>
        </label>
        {!hasOptions && (
          <label className={styles.switchRow}>
            <input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} />
            <span><strong>In stock</strong><small>Switch off when you run out; the product stays listed as sold out.</small></span>
          </label>
        )}
      </section>

      <section className={styles.step} id="f-options">
        <h2><span className={styles.num}>3</span> Colours, sizes or types</h2>
        <p className={styles.hint}>Does this product come in different options?</p>
        <div className={styles.yesNo} role="group" aria-label="Has options">
          <button type="button" aria-pressed={!hasOptions} onClick={() => setHasOptions(false)}>No, just one</button>
          <button type="button" aria-pressed={hasOptions} onClick={() => { setHasOptions(true); if (!groups.length) setGroups([]); }}>Yes, it has options</button>
        </div>
        {hasOptions && (
          <span id="f-combos">
            <OptionsEditor groups={groups} onGroups={setGroups} combos={combos} overrides={overrides}
              onOverride={(key, patch) => setOverrides((o) => ({ ...o, [key]: { ...{ price: "", oldPrice: "", inStock: true }, ...o[key], ...patch } }))}
              keyOf={keyOf} samePrice={samePrice} onSamePrice={setSamePrice} priceOnRequest={onRequest} basePrice={price}
              photos={images} colourPhotos={colourPhotos}
              onColourPhoto={(c, url) => setColourPhotos((m) => { const n = { ...m }; if (url) n[c] = url; else delete n[c]; return n; })}
              error={fieldError("combos") ?? fieldError("options")} />
          </span>
        )}
      </section>

      <section className={styles.step}>
        <button type="button" className={styles.moreToggle} aria-expanded={detailsOpen} onClick={() => setMoreOpen(!detailsOpen)}>
          <span className={styles.num}>4</span> More details <small>(optional: category, description, specifications)</small>
          <span aria-hidden="true" className={detailsOpen ? styles.caretUp : styles.caret}>▾</span>
        </button>
        <div hidden={!detailsOpen} className={styles.more}>
          <div className={styles.grid2} id="f-category">
            <label className={styles.field}>
              <span>Category</span>
              <select name="category_id" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Choose a category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className={styles.field}>
              <span>Subcategory</span>
              <select name="subcategory_id" defaultValue={product?.subcategory_id ?? ""} disabled={!categoryId || subcatOptions.length === 0}>
                <option value="">{categoryId ? (subcatOptions.length ? "Choose (optional)" : "None for this category") : "Choose a category first"}</option>
                {subcatOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
          </div>
          {fieldError("category") && <p role="alert" className={styles.fieldError}>{fieldError("category")}</p>}

          <label className={styles.field} id="f-description">
            <span>Description</span>
            <textarea name="description" defaultValue={product?.description ?? ""} maxLength={4000} rows={5}
              placeholder="What is it, what is it made of, who is it for? Mention delivery or warranty if any." />
            {fieldError("description") && <em role="alert" className={styles.fieldError}>{fieldError("description")}</em>}
          </label>

          <div className={styles.field}>
            <span>Specifications</span>
            <p className={styles.hint}>Short facts customers look for, e.g. Material: Cotton, Warranty: 6 months.</p>
            {specs.map((s, i) => (
              <div key={i} className={styles.specRow}>
                <input aria-label="Name" placeholder="e.g. Material" value={s.label} maxLength={60} onChange={(e) => setSpecs((x) => x.map((r, j) => (j === i ? { ...r, label: e.target.value } : r)))} />
                <input aria-label="Value" placeholder="e.g. Cotton" value={s.value} maxLength={200} onChange={(e) => setSpecs((x) => x.map((r, j) => (j === i ? { ...r, value: e.target.value } : r)))} />
                <button type="button" className={styles.iconBtn} aria-label="Remove" onClick={() => setSpecs((x) => x.filter((_, j) => j !== i))}><Trash2 size={16} /></button>
              </div>
            ))}
            <button type="button" className={styles.linkBtn} onClick={() => setSpecs((x) => [...x, { label: "", value: "" }])}><Plus size={14} aria-hidden="true" /> Add a specification</button>
          </div>

          <label className={styles.field}>
            <span>Label on the photo</span>
            <select name="badge" defaultValue={product?.badge ?? ""}>
              <option value="">None</option>
              <option value="new">New</option>
              <option value="hot">Hot</option>
              <option value="offer">Offer</option>
            </select>
          </label>
        </div>
      </section>

      <div className={styles.saveBar}>
        {state.error && !state.field && <p role="alert" className={styles.barError}>{state.error}</p>}
        {state.error && state.field && <p role="alert" className={styles.barError}>Please fix the highlighted item above.</p>}
        <div className={styles.saveButtons}>
          <button type="submit" name="intent" value="draft" className={styles.draftBtn} disabled={pending}>Save as draft</button>
          <button type="submit" name="intent" value="publish" className={styles.publishBtn} disabled={pending}>
            {pending ? <><Loader2 size={18} className={styles.spin} aria-hidden="true" /> Saving…</> : product?.status === "published" ? "Save & keep live" : "Publish"}
          </button>
        </div>
      </div>
    </form>
  );
}
