import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireBusiness } from "@/lib/auth";
import ProductForm from "@/components/dashboard/ProductForm";
import styles from "@/components/dashboard/dash.module.css";

export const metadata: Metadata = { title: "Edit product" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const { supabase, business } = await requireBusiness();
  if (!business) return null;

  const [{ data: product }, { data: categories }] = await Promise.all([
    supabase.from("products").select("id, name, description, category_id, price, old_price, price_type, badge, images, in_stock, status")
      .eq("id", id).eq("business_id", business.id).maybeSingle(),
    supabase.from("categories").select("id, name").eq("active", true).order("sort_order"),
  ]);
  if (!product) notFound();

  return (
    <>
      <header className={styles.head}><h1>Edit product</h1></header>
      <section className={styles.panel}>
        <ProductForm product={product} categories={categories ?? []} remaining={null} />
      </section>
    </>
  );
}
