import type { Metadata } from "next";
import { requireBusiness } from "@/lib/auth";
import { getPlanUsage } from "@/lib/dashboard";
import ProductForm from "@/components/dashboard/ProductForm";
import styles from "@/components/dashboard/dash.module.css";

export const metadata: Metadata = { title: "Add product" };

export default async function NewProductPage() {
  const { supabase, business } = await requireBusiness();
  if (!business) return null;
  const [usage, { data: categories }, { data: subcategories }] = await Promise.all([
    getPlanUsage(supabase, business.id),
    supabase.from("categories").select("id, name").eq("active", true).order("sort_order"),
    supabase.from("subcategories").select("id, name, category_id").eq("active", true).order("sort_order"),
  ]);
  const remaining = usage.limit === null ? null : usage.limit - usage.count;

  return (
    <>
      <header className={styles.head}><div><h1>Add a product</h1><p className={styles.sub}>Takes about a minute. Only photos, a name and a price are needed.</p></div></header>
      <ProductForm categories={categories ?? []} subcategories={subcategories ?? []} remaining={remaining} />
    </>
  );
}
