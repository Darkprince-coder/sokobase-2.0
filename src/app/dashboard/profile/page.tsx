import type { Metadata } from "next";
import { requireBusiness } from "@/lib/auth";
import ProfileForm from "@/components/dashboard/ProfileForm";
import styles from "@/components/dashboard/dash.module.css";

export const metadata: Metadata = { title: "Shop profile" };

export default async function ProfilePage() {
  const { supabase, business } = await requireBusiness();
  if (!business) return null;

  const [{ data: full }, { data: categories }] = await Promise.all([
    supabase.from("businesses").select("name, description, category_id, location, whatsapp, logo_url, cover_url").eq("id", business.id).single(),
    supabase.from("categories").select("id, name").eq("active", true).order("sort_order"),
  ]);

  return (
    <>
      <header className={styles.head}><h1>Shop profile</h1><p className={styles.sub}>This is what customers see on your storefront.</p></header>
      <section className={styles.panel}>
        <ProfileForm business={full!} categories={categories ?? []} />
      </section>
    </>
  );
}
