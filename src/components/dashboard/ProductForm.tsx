"use client";
import { useState } from "react";
import ActionForm from "./ActionForm";
import ProductImages from "./ProductImages";
import { saveProduct } from "@/app/dashboard/actions";
import { site } from "@/lib/site";
import styles from "./dash.module.css";

type Category = { id: string; name: string };
type Product = {
  id: string; name: string; description: string | null; category_id: string | null;
  price: number | null; old_price: number | null; price_type: "fixed" | "from" | "contact";
  badge: "hot" | "offer" | "new" | null; images: string[]; in_stock: boolean; status: "draft" | "published";
};

export default function ProductForm({ product, categories, remaining }: { product?: Product; categories: Category[]; remaining: number | null }) {
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [priceType, setPriceType] = useState<Product["price_type"]>(product?.price_type ?? "fixed");
  const blocked = !product && remaining !== null && remaining <= 0;

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

      <label className={styles.field}>
        <span>Category (optional)</span>
        <select name="category_id" defaultValue={product?.category_id ?? ""}>
          <option value="">No category</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
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
          <label className={styles.field}><span>Price (KSh)</span><input type="number" name="price" min={0} step="1" defaultValue={product?.price ?? ""} required /></label>
          <label className={styles.field}><span>Old price (optional)</span><input type="number" name="old_price" min={0} step="1" defaultValue={product?.old_price ?? ""} />
            <span className={styles.hint}>Set this to show a strikethrough discount.</span>
          </label>
        </div>
      )}

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
