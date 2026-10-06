import type { Metadata } from "next";
import { requireBusiness } from "@/lib/auth";
import ProfileForm from "@/components/dashboard/ProfileForm";
import styles from "@/components/dashboard/dash.module.css";

export const metadata: Metadata = { title: "Shop profile" };

export default async function ProfilePage() {
  const { supabase, business } = await requireBusiness();
  if (!business) return null;

  const [{ data: full }, { data: categories }, { data: counties }, { data: bizCats }] = await Promise.all([
    supabase.from("businesses").select("name, description, location, whatsapp, logo_url, cover_url, county_id").eq("id", business.id).single(),
    supabase.from("categories").select("id, name").eq("active", true).order("sort_order"),
    supabase.from("counties").select("id, name").order("sort_order"),
    supabase.from("business_categories").select("category_id").eq("business_id", business.id),
  ]);

  return (
    <>
      <header className={styles.head}><div><h1>My shop</h1><p className={styles.sub}>This is what customers see on your shop page.</p></div></header>
      <ProfileForm
        business={{ ...full!, category_ids: (bizCats ?? []).map((r) => r.category_id) }}
        categories={categories ?? []}
        counties={counties ?? []}
      />
    </>
  );
}
