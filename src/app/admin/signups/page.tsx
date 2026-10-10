import type { Metadata } from "next";
import Image from "next/image";
import { MessageCircle } from "lucide-react";
import { adminDb } from "@/lib/admin";
import { ABANDONED_AFTER_DAYS, getPendingSignups } from "@/lib/signups";
import { formatDate, nowMs } from "@/lib/dates";
import { whatsappLink } from "@/lib/site";
import { approveSignup, rejectSignup } from "@/app/admin/actions";
import ActionForm from "@/components/admin/ActionForm";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import styles from "@/components/admin/admin.module.css";

export const metadata: Metadata = { title: "New sign-ups" };

const DAY = 86400000;

export default async function SignupsPage({ searchParams }: { searchParams: Promise<{ done?: string }> }) {
  const doneMsg = ((await searchParams).done ?? "").slice(0, 200);
  const { db } = await adminDb();
  const [signups, { data: plans }] = await Promise.all([
    getPendingSignups(db),
    db.from("plans").select("id, slug, name, price_kes, duration_days").eq("active", true).order("sort_order"),
  ]);
  const basic = plans?.find((p) => p.slug === "basic") ?? plans?.[0];
  const now = nowMs();

  return (
    <>
      <header className={styles.head}>
        <h1>New sign-ups</h1>
        <p className={styles.sub}>
          Shops that signed up from the Sell page. They can set up and add up to 10 products, but customers can&apos;t see them until you approve.
          Approving with KSh 0 gives a free trial; enter the amount if they paid. Sign-ups with no products are removed after {ABANDONED_AFTER_DAYS} days.
        </p>
      </header>

      {doneMsg && <p role="status" className={styles.msgOk} style={{ marginBottom: 14 }}>✓ {doneMsg}</p>}

      {signups.length === 0 ? (
        <section className={styles.panel}><p className={styles.empty}>No shops waiting for approval.</p></section>
      ) : signups.map((s) => {
        const waiting = Math.floor((now - new Date(s.createdAt).getTime()) / DAY);
        const chat = whatsappLink(s.whatsapp, `Hi ${s.ownerName || "there"}, this is SokoBase about your shop ${s.name}.`);
        const planId = s.requestedPlanId && plans?.some((p) => p.id === s.requestedPlanId) ? s.requestedPlanId : basic?.id;
        const requested = plans?.find((p) => p.id === s.requestedPlanId);
        return (
          <section key={s.id} className={styles.panel} aria-label={s.name}>
            <div className={styles.signupTop}>
              {s.logoUrl
                ? <Image src={`${s.logoUrl}#logo`} alt="" width={56} height={56} className={styles.signupLogo} />
                : <span className={styles.signupLogo} aria-hidden="true">{s.name.slice(0, 1).toUpperCase()}</span>}
              <div style={{ minWidth: 0, flex: 1 }}>
                <h2 style={{ marginBottom: 2 }}>{s.name}</h2>
                <p className={styles.muted} style={{ fontSize: 13.5 }}>
                  {s.ownerName}{s.email ? ` · ${s.email}` : ""} · {s.location}{s.county ? `, ${s.county}` : ""}
                </p>
                <p className={styles.muted} style={{ fontSize: 13 }}>
                  {s.categories.join(", ") || "No categories"} · Signed up {formatDate(s.createdAt)} ({waiting === 0 ? "today" : `${waiting} day${waiting === 1 ? "" : "s"} ago`})
                  {requested ? ` · Chose ${requested.name}` : ""}
                </p>
              </div>
              <a href={chat} target="_blank" rel="noopener noreferrer" className={styles.signupChat}><MessageCircle size={16} aria-hidden="true" /> WhatsApp {s.whatsapp}</a>
            </div>

            <div className={styles.signupProducts}>
              <strong>{s.productCount} product{s.productCount === 1 ? "" : "s"}</strong>
              {s.photos.length > 0 && (
                <div className={styles.signupThumbs}>
                  {s.photos.map((u) => <Image key={u} src={`${u}#fill`} alt="" width={64} height={64} />)}
                </div>
              )}
            </div>

            <div className={styles.signupActions}>
              <ActionForm action={approveSignup} submitLabel="Approve and go live">
                <input type="hidden" name="business_id" value={s.id} />
                <div className={styles.grid2}>
                  <label className={styles.field}>Plan
                    <select name="plan_id" defaultValue={planId} required>
                      {(plans ?? []).map((p) => <option key={p.id} value={p.id}>{p.name} (KSh {p.price_kes.toLocaleString("en-KE")})</option>)}
                    </select>
                  </label>
                  <label className={styles.field}>Days<input type="number" name="duration_days" min={1} max={365} defaultValue={30} required /></label>
                </div>
                <div className={styles.grid2}>
                  <label className={styles.field}>Amount paid (KSh) <span className={styles.hint}>(0 = free trial)</span><input type="number" name="amount_kes" min={0} max={1000000} defaultValue={0} required /></label>
                  <label className={styles.field}>Payment note <span className={styles.hint}>(M-Pesa code, optional)</span><input name="payment_note" maxLength={120} /></label>
                </div>
              </ActionForm>
              <form action={rejectSignup} className={styles.signupReject}>
                <input type="hidden" name="id" value={s.id} />
                <label className={styles.hint}><input type="checkbox" name="notify" value="1" defaultChecked /> Email them that they weren&apos;t approved</label>
                <ConfirmSubmit label="Reject and delete" question="Delete this shop, its login and photos?" confirmLabel="Yes, delete" />
              </form>
            </div>
          </section>
        );
      })}
    </>
  );
}
