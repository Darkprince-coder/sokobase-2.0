import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { MessageCircle } from "lucide-react";
import { adminDb } from "@/lib/admin";
import { categoryNames, one, type BusinessCategoriesRel, type Rel } from "@/lib/relations";
import { formatDate, isPast } from "@/lib/dates";
import { whatsappLink } from "@/lib/site";
import { renewSubscription, resetOwnerPassword, setBusinessStatus } from "@/app/admin/actions";
import ActionForm from "@/components/admin/ActionForm";
import StatusPill from "@/components/admin/StatusPill";
import Button from "@/components/Button";
import styles from "@/components/admin/admin.module.css";

export const metadata: Metadata = { title: "Business" };

export default async function BusinessDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const { db } = await adminDb();

  const { data: b } = await db.from("businesses").select("id, owner_id, slug, name, description, location, whatsapp, status, created_at, products(count), counties(name), business_categories(categories(name))").eq("id", id).maybeSingle();
  if (!b) notFound();

  const [{ data: subs }, { data: plans }, { data: owner }] = await Promise.all([
    db.from("subscriptions").select("id, status, starts_at, ends_at, payment_note, plans(id, name, product_limit)").eq("business_id", id).order("ends_at", { ascending: false }),
    db.from("plans").select("id, name, price_kes, duration_days").eq("active", true).order("sort_order"),
    db.auth.admin.getUserById(b.owner_id),
  ]);

  const current = (subs ?? []).find((s) => s.status === "active" && !isPast(s.ends_at));
  const currentPlan = one(current?.plans);
  const state = b.status === "suspended" ? "suspended" : current ? "active" : "expired";
  const defaultPlan = currentPlan?.id ?? plans?.[0]?.id;
  const nextStatus = b.status === "active" ? "suspended" : "active";
  const rel = b as unknown as { counties: Rel<{ name: string }>; business_categories: BusinessCategoriesRel };
  const cats = categoryNames(rel.business_categories);

  return (
    <>
      <header className={styles.head}>
        <p className={styles.sub}><Link href="/admin/businesses">Businesses</Link> / {b.name}</p>
        <h1 style={{ marginTop: 6 }}>{b.name} <StatusPill kind={state} /></h1>
      </header>

      <div className={styles.two}>
        <section className={styles.panel}>
          <h2>Details</h2>
          <div className={styles.dl}>
            <div><span>Shop link</span><span className={styles.mono}>/store/{b.slug}</span></div>
            <div><span>Owner email</span><span>{owner.user?.email ?? "-"}</span></div>
            <div><span>County</span><span>{one(rel.counties)?.name ?? "-"}</span></div>
            <div><span>Location</span><span>{b.location}</span></div>
            <div><span>Categories</span><span>{cats.length ? cats.join(", ") : "-"}</span></div>
            <div><span>WhatsApp</span><span className={styles.mono}>{b.whatsapp}</span></div>
            <div><span>Products</span><span className={styles.mono}>{one(b.products)?.count ?? 0}{currentPlan?.product_limit ? ` / ${currentPlan.product_limit}` : ""}</span></div>
            <div><span>Joined</span><span>{formatDate(b.created_at)}</span></div>
          </div>
          <div className={styles.btnRow} style={{ marginTop: 14 }}>
            <Button href={whatsappLink(b.whatsapp, `Hi ${b.name}, this is SokoBase.`)} external size="sm" variant="soft" icon={<MessageCircle size={15} />}>Message owner</Button>
            <form action={setBusinessStatus}>
              <input type="hidden" name="id" value={b.id} />
              <input type="hidden" name="status" value={nextStatus} />
              <Button type="submit" size="sm" variant="outline" className={b.status === "active" ? styles.dangerBtn : undefined}>
                {b.status === "active" ? "Suspend shop" : "Reactivate shop"}
              </Button>
            </form>
          </div>
        </section>

        <section className={styles.panel}>
          <h2>{current ? "Renew or change plan" : "Activate subscription"}</h2>
          <p className={styles.sub} style={{ marginBottom: 12 }}>
            {current ? `Active until ${formatDate(current.ends_at)}. A renewal starts when the current period ends.` : "No live subscription. Editing is disabled for the owner; the shop stays visible."}
          </p>
          <ActionForm action={renewSubscription} submitLabel="Save subscription">
            <input type="hidden" name="business_id" value={b.id} />
            <div className={styles.grid2}>
              <label className={styles.field}>Plan
                <select name="plan_id" defaultValue={defaultPlan} required>
                  {(plans ?? []).map((p) => <option key={p.id} value={p.id}>{p.name} (KSh {p.price_kes.toLocaleString("en-KE")})</option>)}
                </select>
              </label>
              <label className={styles.field}>Days<input type="number" name="duration_days" min={1} max={365} defaultValue={30} required /></label>
            </div>
            <label className={styles.field}>Payment note <span className={styles.hint}>(M-Pesa code)</span><input name="payment_note" maxLength={120} /></label>
          </ActionForm>
        </section>
      </div>

      <section className={styles.panel}>
        <h2>Subscription history</h2>
        {(subs ?? []).length === 0 ? <p className={styles.empty}>No subscriptions yet.</p> : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Plan</th><th>Starts</th><th>Ends</th><th>Payment note</th></tr></thead>
              <tbody>
                {subs!.map((s) => (
                  <tr key={s.id}><td>{one(s.plans)?.name}</td><td>{formatDate(s.starts_at)}</td><td>{formatDate(s.ends_at)}</td><td className={styles.mono}>{s.payment_note ?? "-"}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={styles.panel}>
        <h2>Reset owner password</h2>
        <p className={styles.sub} style={{ marginBottom: 12 }}>Sets a new password immediately. Send it to the owner privately and ask them to keep it safe.</p>
        <ActionForm action={resetOwnerPassword} submitLabel="Set new password" resetOnSuccess variant="outline">
          <input type="hidden" name="business_id" value={b.id} />
          <label className={styles.field}>New password<input type="text" name="password" minLength={10} maxLength={72} autoComplete="off" required /></label>
        </ActionForm>
      </section>
    </>
  );
}
