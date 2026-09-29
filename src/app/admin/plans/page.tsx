import type { Metadata } from "next";
import { adminDb } from "@/lib/admin";
import { updatePlan } from "@/app/admin/actions";
import ActionForm from "@/components/admin/ActionForm";
import styles from "@/components/admin/admin.module.css";

export const metadata: Metadata = { title: "Plans" };

export default async function PlansPage() {
  const { db } = await adminDb();
  const { data: plans } = await db.from("plans").select("*").order("sort_order");
  return (
    <>
      <header className={styles.head}><h1>Plans</h1><p className={styles.sub}>Prices and product limits. Changes apply to new invites and renewals; existing subscriptions keep running.</p></header>
      <div className={styles.two}>
        {(plans ?? []).map((p) => (
          <section key={p.id} className={styles.panel}>
            <h2>{p.name}</h2>
            <ActionForm action={updatePlan} submitLabel="Save plan">
              <input type="hidden" name="id" value={p.id} />
              <div className={styles.grid2}>
                <label className={styles.field}>Name<input name="name" defaultValue={p.name} maxLength={30} required /></label>
                <label className={styles.field}>Price (KSh)<input type="number" name="price_kes" min={0} defaultValue={p.price_kes} required /></label>
                <label className={styles.field}>Product limit <span className={styles.hint}>(empty = unlimited)</span><input type="number" name="product_limit" min={1} defaultValue={p.product_limit ?? ""} /></label>
                <label className={styles.field}>Default days<input type="number" name="duration_days" min={1} max={365} defaultValue={p.duration_days} required /></label>
              </div>
              <label className={styles.check}><input type="checkbox" name="active" defaultChecked={p.active} /> Available for new invites</label>
            </ActionForm>
          </section>
        ))}
      </div>
    </>
  );
}
