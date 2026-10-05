import type { Metadata } from "next";
import Link from "next/link";
import { adminDb } from "@/lib/admin";
import { describeAudit } from "@/lib/admin-labels";
import styles from "@/components/admin/admin.module.css";

export const metadata: Metadata = { title: "Activity" };

const when = (iso: string) => new Date(iso).toLocaleString("en-KE", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Nairobi" });

// Read-only record of every change made in the admin area (admin_audit_log).
export default async function ActivityPage() {
  const { db } = await adminDb();
  const { data } = await db.from("admin_audit_log").select("id, actor_id, action, target_type, target_id, details, created_at")
    .order("created_at", { ascending: false }).limit(300);
  const rows = data ?? [];

  const businessIds = [...new Set(rows.filter((r) => r.target_type === "business" && r.target_id).map((r) => r.target_id as string))];
  const actorIds = [...new Set(rows.map((r) => r.actor_id).filter(Boolean) as string[])];
  const [{ data: businesses }, { data: actors }] = await Promise.all([
    businessIds.length ? db.from("businesses").select("id, name").in("id", businessIds) : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    actorIds.length ? db.from("profiles").select("id, full_name").in("id", actorIds) : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
  ]);
  const bizName = new Map((businesses ?? []).map((b) => [b.id, b.name]));
  const actorName = new Map((actors ?? []).map((a) => [a.id, a.full_name]));

  return (
    <>
      <header className={styles.head}>
        <h1>Activity</h1>
        <p className={styles.sub}>Every change made in the admin area, newest first (last 300).</p>
      </header>
      <section className={styles.panel}>
        {rows.length === 0 ? <p className={styles.empty}>No admin activity recorded yet.</p> : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>When</th><th>What</th><th>Shop</th><th>By</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td style={{ whiteSpace: "nowrap" }}>{when(r.created_at)}</td>
                    <td>{describeAudit(r.action, r.details as Record<string, unknown>)}</td>
                    <td>{r.target_type === "business" && r.target_id ? <Link href={`/admin/businesses/${r.target_id}`}>{bizName.get(r.target_id) ?? "Deleted shop"}</Link> : <span className={styles.muted}>-</span>}</td>
                    <td className={styles.muted}>{(r.actor_id && actorName.get(r.actor_id)) || "Admin"}</td>
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
