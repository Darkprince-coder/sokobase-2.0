import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { adminDb } from "@/lib/admin";
import { saveSubcategory, deleteSubcategory } from "@/app/admin/actions";
import ActionForm from "@/components/admin/ActionForm";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import styles from "@/components/admin/admin.module.css";

export const metadata: Metadata = { title: "Subcategories" };

export default async function SubcategoriesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const { db } = await adminDb();
  const { data: category } = await db.from("categories").select("id, name").eq("id", id).maybeSingle();
  if (!category) notFound();
  const { data: subcategories } = await db.from("subcategories").select("*").eq("category_id", id).order("sort_order");

  return (
    <>
      <header className={styles.head}>
        <p className={styles.sub}><Link href="/admin/categories">Categories</Link> / {category.name}</p>
        <h1 style={{ marginTop: 6 }}>{category.name}: subcategories</h1>
        <p className={styles.sub}>E.g. under Electronics: TVs, Laptops, Phones. Businesses choose from this list when adding a product; they can&apos;t type their own, to keep filtering clean.</p>
      </header>

      <section className={styles.panel}>
        <h2>Add subcategory</h2>
        <ActionForm action={saveSubcategory} submitLabel="Add subcategory" resetOnSuccess>
          <input type="hidden" name="category_id" value={category.id} />
          <div className={styles.grid2}>
            <label className={styles.field}>Name<input name="name" maxLength={40} required /></label>
            <label className={styles.field}>Order<input type="number" name="sort_order" min={0} max={999} defaultValue={((subcategories ?? []).length + 1)} required /></label>
          </div>
          <label className={styles.check}><input type="checkbox" name="active" defaultChecked /> Active</label>
        </ActionForm>
      </section>

      <section className={styles.panel}>
        <h2>All subcategories</h2>
        {(subcategories ?? []).length === 0 ? <p className={styles.empty}>None yet.</p> : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Name</th><th>Slug</th><th>Order</th><th>Active</th><th></th></tr></thead>
              <tbody>
                {subcategories!.map((s) => (
                  <tr key={s.id}>
                    <td>{s.name}</td>
                    <td className={styles.mono}>{s.slug}</td>
                    <td className={styles.mono}>{s.sort_order}</td>
                    <td>{s.active ? "Yes" : "No"}</td>
                    <td>
                      <form action={deleteSubcategory}>
                        <input type="hidden" name="id" value={s.id} /><input type="hidden" name="category_id" value={category.id} />
                        <ConfirmSubmit label="Delete" question="Delete? (Hidden instead if products use it)" confirmLabel="Delete" />
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
