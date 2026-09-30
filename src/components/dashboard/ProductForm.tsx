"use client";
import { useMemo, useState } from "react";
import ActionForm from "./ActionForm";
import ProductImages from "./ProductImages";
import VariantsEditor, { type VariantRow } from "./VariantsEditor";
import { saveProduct } from "@/app/dashboard/actions";
import { site } from "@/lib/site";
import styles from "./dash.module.css";

type Category = { id: string; name: string };
type Subcategory = { id: string; name: string; category_id: string };
type Variant = { id: string; label: string; price: number | null; oldPrice: number | null; inStock: boolean };
type Product = {
  id: string; name: string; description: string | null; category_id: string | null; subcategory_id?: string | null;
  price: number | null; old_price: number | null; price_type: "fixed" | "from" | "contact";
  badge: "hot" | "offer" | "new" | null; images: string[]; in_stock: boolean; status: "draft" | "published";
  specs: Record<string, string>; variants: Variant[];
};

const specsToText = (specs: Record<string, string>) => Object.entries(specs).map(([k, v]) => `${k}: ${v}`).join("\n");

export default function ProductForm({ product, categories, subcategories, remaining }: { product?: Product; categories: Category[]; subcategories: Subcategory[]; remaining: number | null }) {
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [priceType, setPriceType] = useState<Product["price_type"]>(product?.price_type ?? "fixed");
  const [categoryId, setCategoryId] = useState(product?.category_id ?? "");
  const blocked = !product && remaining !== null && remaining <= 0;

  const initialVariants: VariantRow[] = (product?.variants ?? []).map((v) => ({
    id: v.id, label: v.label, price: v.price?.toString() ?? "", oldPrice: v.oldPrice?.toString() ?? "", inStock: v.inStock,
  }));

  const subcatOptions = useMemo(() => subcategories.filter((s) => s.category_id === categoryId), [subcategories, categoryId]);

  if (blocked) {
    return (
      <div className={styles.msgErr}>
        You have reached your plan&apos;s product limit. Contact SokoBase on WhatsApp to upgrade your plan
        {site.supportWhatsapp ? "." : ", or ask us to raise your limit."}
      </div>
    );
  }

  return (
    <ActionForm action={saveProduct} submitLabel={product ? "Save product" : "Add product"}>
      {product && <input type="hidden" name="id" value={product.id} />}
      <input type="hidden" name="images" value={JSON.stringify(images)} />

      <div className={styles.field}>
        <span>Photos</span>
        <ProductImages value={images} onChange={setImages} />
      </div>

      <label className={styles.field}><span>Product name</span><input type="text" name="name" defaultValue={product?.name} maxLength={120} required /></label>
      <label className={styles.field}><span>Description (optional)</span><textarea name="description" defaultValue={product?.description ?? ""} maxLength={4000} rows={4} /></label>

      <div className={styles.grid2}>
        <label className={styles.field}>
          <span>Category (optional)</span>
          <select name="category_id" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">No category</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className={styles.field}>
          <span>Subcategory (optional)</span>
          <select name="subcategory_id" defaultValue={product?.subcategory_id ?? ""} disabled={!categoryId || subcatOptions.length === 0}>
            <option value="">{categoryId ? (subcatOptions.length ? "No subcategory" : "None available for this category") : "Choose a category first"}</option>
            {subcatOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
      </div>

      <label className={styles.field}>
        <span>Specifications (optional)</span>
        <textarea name="specs" defaultValue={product ? specsToText(product.specs) : ""} rows={4} placeholder={"Warranty: 2 months\nMaterial: Stainless steel"} />
        <span className={styles.hint}>One per line, as "Label: Value".</span>
      </label>

      <div className={styles.field}>
        <span>Pricing</span>
        <div className={styles.btnRow}>
          {(["fixed", "from", "contact"] as const).map((t) => (
            <label key={t} className={styles.check}>
              <input type="radio" name="price_type" value={t} checked={priceType === t} onChange={() => setPriceType(t)} />
              {t === "fixed" ? "Fixed price" : t === "from" ? "Starting from" : "Contact for price"}
            </label>
          ))}
        </div>
      </div>

      {priceType !== "contact" && (
        <div className={styles.grid2}>
          <label className={styles.field}><span>Base price (KSh)</span><input type="number" name="price" min={0} step="1" defaultValue={product?.price ?? ""} required /></label>
          <label className={styles.field}><span>Old price (optional)</span><input type="number" name="old_price" min={0} step="1" defaultValue={product?.old_price ?? ""} />
            <span className={styles.hint}>Shows a strikethrough discount. Used when no option below is selected.</span>
          </label>
        </div>
      )}

      <VariantsEditor initial={initialVariants} />

      <label className={styles.field}>
        <span>Badge (optional)</span>
        <select name="badge" defaultValue={product?.badge ?? ""}>
          <option value="">No badge</option>
          <option value="hot">Hot</option>
          <option value="offer">Offer</option>
          <option value="new">New</option>
        </select>
      </label>

      <div className={styles.grid2}>
        <label className={styles.check}><input type="checkbox" name="in_stock" defaultChecked={product?.in_stock ?? true} /> In stock</label>
        <label className={styles.field}>
          <span>Visibility</span>
          <select name="status" defaultValue={product?.status ?? "published"}>
            <option value="published">Published, visible to customers</option>
            <option value="draft">Draft, hidden for now</option>
          </select>
        </label>
      </div>
    </ActionForm>
  );
}
