import type { Metadata } from "next";
import { adminDb } from "@/lib/admin";
import { createPlan, deletePlan, updatePlan } from "@/app/admin/actions";
import ActionForm from "@/components/admin/ActionForm";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import styles from "@/components/admin/admin.module.css";

export const metadata: Metadata = { title: "Plans" };

type Plan = { id: string; slug: string; name: string; price_kes: number; product_limit: number | null; duration_days: number; active: boolean; sort_order: number };

export default async function PlansPage() {
  const { db } = await adminDb();
  const { data } = await db.from("plans").select("id, slug, name, price_kes, product_limit, duration_days, active, sort_order").order("sort_order");
  const plans = (data ?? []) as Plan[];
  const nowIso = new Date().toISOString();

  // How each plan is used: shops on it right now, and whether anything ever referenced it.
  const usage = await Promise.all(plans.map(async (p) => {
    const [{ data: live }, { count: subs }, { count: invites }] = await Promise.all([
      db.from("subscriptions").select("business_id").eq("plan_id", p.id).eq("status", "active").gt("ends_at", nowIso).limit(5000),
      db.from("subscriptions").select("id", { count: "exact", head: true }).eq("plan_id", p.id),
      db.from("invites").select("id", { count: "exact", head: true }).eq("plan_id", p.id),
    ]);
    return { liveShops: new Set((live ?? []).map((s) => s.business_id)).size, used: (subs ?? 0) + (invites ?? 0) > 0 };
  }));
  const visible = plans.filter((p) => p.active).length;

  return (
    <>
      <header className={styles.head}>
        <h1>Plans</h1>
        <p className={styles.sub}>
          Prices and product limits. <strong>Showing</strong> plans appear on the Sell page and in the invite, approve and renew lists.
          Changes apply to new subscriptions; shops already on a plan keep it until they renew.
        </p>
      </header>

      <div className={styles.two}>
        {plans.map((p, i) => {
          const u = usage[i];
          const lastVisible = p.active && visible === 1;
          return (
            <section key={p.id} className={styles.panel}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                <h2 style={{ marginBottom: 0 }}>{p.name}</h2>
                <span className={p.active ? styles.pillOn : styles.pillOff}>{p.active ? "Showing" : "Hidden"}</span>
              </div>
              <p className={styles.muted} style={{ fontSize: 13, margin: "4px 0 12px" }}>
                {u.liveShops === 0 ? "No shops on this plan right now." : `${u.liveShops} shop${u.liveShops === 1 ? "" : "s"} on this plan right now.`}
              </p>
              <ActionForm action={updatePlan} submitLabel="Save plan">
                <input type="hidden" name="id" value={p.id} />
                <div className={styles.grid2}>
                  <label className={styles.field}>Name<input name="name" defaultValue={p.name} maxLength={30} required /></label>
                  <label className={styles.field}>Price (KSh)<input type="number" name="price_kes" min={0} defaultValue={p.price_kes} required /></label>
                  <label className={styles.field}>Product limit <span className={styles.hint}>(empty = unlimited)</span><input type="number" name="product_limit" min={1} defaultValue={p.product_limit ?? ""} /></label>
                  <label className={styles.field}>Default days<input type="number" name="duration_days" min={1} max={365} defaultValue={p.duration_days} required /></label>
                  <label className={styles.field}>Order on the Sell page <span className={styles.hint}>(lower shows first)</span><input type="number" name="sort_order" min={0} max={999} defaultValue={p.sort_order} /></label>
                </div>
                <label className={styles.check}><input type="checkbox" name="active" defaultChecked={p.active} disabled={lastVisible} /> Show this plan (Sell page, invites, approvals, renewals)</label>
                {lastVisible && <><input type="hidden" name="active" value="on" /><p className={styles.hint}>This is your only showing plan, so it can&apos;t be hidden.</p></>}
              </ActionForm>
              <div style={{ borderTop: "1px solid var(--line)", marginTop: 14, paddingTop: 12 }}>
                {u.used ? (
                  <p className={styles.hint}>Shops or invites have used this plan, so it can&apos;t be deleted (their history stays linked to it). Untick <em>Show this plan</em> to stop offering it.</p>
                ) : lastVisible ? (
                  <p className={styles.hint}>Add or show another plan before deleting this one.</p>
                ) : (
                  <form action={deletePlan} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <input type="hidden" name="id" value={p.id} />
                    <span className={styles.hint}>Never used, so it can be deleted.</span>
                    <ConfirmSubmit label="Delete plan" question={`Delete ${p.name}?`} confirmLabel="Yes, delete" />
                  </form>
                )}
              </div>
            </section>
          );
        })}

        <section className={styles.panel}>
          <h2>Add a plan</h2>
          <p className={styles.muted} style={{ fontSize: 13, margin: "4px 0 12px" }}>New plans show on the Sell page straight away.</p>
          <ActionForm action={createPlan} submitLabel="Add plan" resetOnSuccess>
            <div className={styles.grid2}>
              <label className={styles.field}>Name<input name="name" maxLength={30} placeholder="e.g. Premium" required /></label>
              <label className={styles.field}>Price (KSh)<input type="number" name="price_kes" min={0} required /></label>
              <label className={styles.field}>Product limit <span className={styles.hint}>(empty = unlimited)</span><input type="number" name="product_limit" min={1} /></label>
              <label className={styles.field}>Default days<input type="number" name="duration_days" min={1} max={365} defaultValue={30} required /></label>
              <label className={styles.field}>Order on the Sell page <span className={styles.hint}>(lower shows first)</span><input type="number" name="sort_order" min={0} max={999} defaultValue={(plans.at(-1)?.sort_order ?? 0) + 1} /></label>
            </div>
          </ActionForm>
        </section>
      </div>
    </>
  );
}
