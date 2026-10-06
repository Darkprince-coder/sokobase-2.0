import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireBusiness } from "@/lib/auth";
import ProductForm from "@/components/dashboard/ProductForm";
import type { OptionGroup } from "@/lib/variants";
import styles from "@/components/dashboard/dash.module.css";

export const metadata: Metadata = { title: "Edit product" };

export default async function EditProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ copied?: string }> }) {
  const [{ id }, { copied }] = await Promise.all([params, searchParams]);
  if (!z.string().uuid().safeParse(id).success) notFound();
  const { supabase, business } = await requireBusiness();
  if (!business) return null;

  const [{ data: product }, { data: variants }, { data: categories }, { data: subcategories }] = await Promise.all([
    supabase.from("products").select("id, name, description, category_id, subcategory_id, price, old_price, price_type, badge, images, in_stock, status, specs, options")
      .eq("id", id).eq("business_id", business.id).maybeSingle(),
    supabase.from("product_variants").select("id, label, price, old_price, in_stock, attributes, image_url").eq("product_id", id).order("sort_order"),
    supabase.from("categories").select("id, name").eq("active", true).order("sort_order"),
    supabase.from("subcategories").select("id, name, category_id").eq("active", true).order("sort_order"),
  ]);
  if (!product) notFound();

  const full = {
    ...product,
    price: product.price == null ? null : Number(product.price),
    old_price: product.old_price == null ? null : Number(product.old_price),
    specs: (product.specs ?? {}) as Record<string, string>,
    options: (Array.isArray(product.options) ? product.options : []) as OptionGroup[],
    variants: (variants ?? []).map((v) => ({
      id: v.id, label: v.label, price: v.price == null ? null : Number(v.price), oldPrice: v.old_price ? Number(v.old_price) : null,
      inStock: v.in_stock, attributes: (v.attributes ?? {}) as Record<string, string>, imageUrl: v.image_url ?? null,
    })),
  };

  return (
    <>
      <header className={styles.head}><h1>Edit product</h1></header>
      {copied && <p className={styles.msgOk} role="status" style={{ marginBottom: 14 }}>Copy created as a draft. Change the name, photos or price, then set it to Published.</p>}
      <ProductForm product={full} categories={categories ?? []} subcategories={subcategories ?? []} remaining={null} />
    </>
  );
}
