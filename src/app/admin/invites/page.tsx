import type { Metadata } from "next";
import Link from "next/link";
import { adminDb } from "@/lib/admin";
import { formatDate } from "@/lib/dates";
import { site } from "@/lib/site";
import { revokeInvite } from "@/app/admin/actions";
import InviteForm from "@/components/admin/InviteForm";
import CopyButton from "@/components/admin/CopyButton";
import StatusPill from "@/components/admin/StatusPill";
import Button from "@/components/Button";
import styles from "@/components/admin/admin.module.css";

export const metadata: Metadata = { title: "Invites" };
const one = <T,>(v: T | T[] | null | undefined): T | undefined => (Array.isArray(v) ? v[0] : v ?? undefined);

export default async function InvitesPage() {
  const { db } = await adminDb();
  const [{ data: plans }, { data: invites }] = await Promise.all([
    db.from("plans").select("id, name, price_kes, duration_days").eq("active", true).order("sort_order"),
    db.from("invites").select("id, code, note, expires_at, used_at, business_id, plans(name), businesses(name)").order("created_at", { ascending: false }).limit(100),
  ]);

  return (
    <>
      <header className={styles.head}>
        <h1>Invites</h1>
        <p className={styles.sub}>A business can only register with a one-time invite. Create one after they have paid, then send the link on WhatsApp.</p>
      </header>

      <section className={styles.panel}>
        <h2>New invite</h2>
        {(plans ?? []).length === 0 ? <p className={styles.empty}>Create an active plan first.</p> : <InviteForm plans={plans!} />}
      </section>

      <section className={styles.panel}>
        <h2>Recent invites</h2>
        {(invites ?? []).length === 0 ? <p className={styles.empty}>No invites yet.</p> : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Code</th><th>Plan</th><th>Issued to</th><th>Expires</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {invites!.map((i) => {
                  const kind = i.used_at ? "used" : new Date(i.expires_at).getTime() < Date.now() ? "lapsed" : "unused";
                  const biz = one(i.businesses);
                  return (
                    <tr key={i.id}>
                      <td className={styles.mono}>{i.code}</td>
                      <td>{one(i.plans)?.name}</td>
                      <td>{i.note ?? <span className={styles.muted}>-</span>}{biz && i.business_id && <div><Link href={`/admin/businesses/${i.business_id}`}>{biz.name}</Link></div>}</td>
                      <td>{formatDate(i.expires_at)}</td>
                      <td><StatusPill kind={kind} /></td>
                      <td>
                        {kind === "unused" && (
                          <div className={styles.rowActions}>
                            <CopyButton value={`${site.url}/join?code=${i.code}`} label="Copy link" />
                            <form action={revokeInvite}><input type="hidden" name="id" value={i.id} /><Button type="submit" size="sm" variant="outline" className={styles.dangerBtn}>Revoke</Button></form>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
