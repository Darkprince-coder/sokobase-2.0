import type { Metadata } from "next";
import { adminDb } from "@/lib/admin";
import { saveCategory } from "@/app/admin/actions";
import ActionForm from "@/components/admin/ActionForm";
import styles from "@/components/admin/admin.module.css";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const { db } = await adminDb();
  const { data: categories } = await db.from("categories").select("*").order("sort_order");
  return (
    <>
      <header className={styles.head}><h1>Categories</h1><p className={styles.sub}>Businesses and products are grouped by these. Turn one off to hide it from new shops without deleting it. Slugs never change after creation, to protect Google rankings.</p></header>

      <section className={styles.panel}>
        <h2>Add category</h2>
        <ActionForm action={saveCategory} submitLabel="Add category" resetOnSuccess>
          <div className={styles.grid2}>
            <label className={styles.field}>Name<input name="name" maxLength={40} required /></label>
            <label className={styles.field}>Icon <span className={styles.hint}>(lucide name, e.g. shopping-basket)</span><input name="icon" maxLength={40} /></label>
            <label className={styles.field}>Order<input type="number" name="sort_order" min={0} max={999} defaultValue={((categories ?? []).length + 1) * 1} required /></label>
          </div>
          <label className={styles.check}><input type="checkbox" name="active" defaultChecked /> Active</label>
        </ActionForm>
      </section>

      <section className={styles.panel}>
        <h2>All categories</h2>
        {(categories ?? []).map((c) => (
          <div key={c.id} style={{ borderBottom: "1px solid var(--line)", padding: "14px 0" }}>
            <ActionForm action={saveCategory} submitLabel="Save" variant="soft">
              <input type="hidden" name="id" value={c.id} />
              <div className={styles.grid2}>
                <label className={styles.field}>Name<input name="name" defaultValue={c.name} maxLength={40} required /></label>
                <label className={styles.field}>Icon<input name="icon" defaultValue={c.icon ?? ""} maxLength={40} /></label>
                <label className={styles.field}>Order<input type="number" name="sort_order" min={0} max={999} defaultValue={c.sort_order} required /></label>
                <div className={styles.field}>Slug<span className={styles.mono}>{c.slug}</span></div>
              </div>
              <label className={styles.check}><input type="checkbox" name="active" defaultChecked={c.active} /> Active</label>
            </ActionForm>
          </div>
        ))}
      </section>
    </>
  );
}
