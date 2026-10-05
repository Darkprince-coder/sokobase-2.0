import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { BadgeCheck, BellRing, ExternalLink, MessageCircle } from "lucide-react";
import { adminDb } from "@/lib/admin";
import { categoryNames, one, type BusinessCategoriesRel, type Rel } from "@/lib/relations";
import { formatDate, isPast, nowMs } from "@/lib/dates";
import { site, whatsappLink } from "@/lib/site";
import { renewalReminderLink } from "@/lib/reminders";
import { formatPrice } from "@/lib/format";
import type { PriceType } from "@/lib/types";
import {
  cancelSubscription, moderateProduct, renewSubscription, resetOwnerPassword, resolveReport, setBusinessStatus, setSubscriptionEnd, setVerified,
} from "@/app/admin/actions";
import ActionForm from "@/components/admin/ActionForm";
import StatusPill from "@/components/admin/StatusPill";
import Button from "@/components/Button";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import { REPORT_REASONS, describeAudit } from "@/lib/admin-labels";
import styles from "@/components/admin/admin.module.css";

export const metadata: Metadata = { title: "Business" };

type Sub = { id: string; status: "active" | "cancelled"; starts_at: string; ends_at: string; payment_note: string | null; amount_kes: number | null; plans: Rel<{ id: string; name: string; product_limit: number | null; price_kes: number }> };

export default async function BusinessDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const { db } = await adminDb();

  const { data: b } = await db.from("businesses")
    .select("id, owner_id, slug, name, description, location, whatsapp, status, verified_at, created_at, products(count), counties(name), business_categories(categories(name))")
    .eq("id", id).maybeSingle();
  if (!b) notFound();

  const since30 = new Date(nowMs() - 30 * 86400000).toISOString();
  const [{ data: subsRaw }, { data: plans }, { data: owner }, { data: products }, { data: reports }, { data: activity }, { count: clicks30 }] = await Promise.all([
    db.from("subscriptions").select("id, status, starts_at, ends_at, payment_note, amount_kes, plans(id, name, product_limit, price_kes)").eq("business_id", id).order("ends_at", { ascending: false }),
    db.from("plans").select("id, name, price_kes, duration_days").eq("active", true).order("sort_order"),
    db.auth.admin.getUserById(b.owner_id),
    db.from("products").select("id, slug, name, status, in_stock, price, price_type, created_at").eq("business_id", id).order("created_at", { ascending: false }).limit(200),
    db.from("reports").select("id, reason, details, contact, status, created_at, product_id, products(name)").eq("business_id", id).order("created_at", { ascending: false }).limit(20),
    db.from("admin_audit_log").select("id, action, details, created_at").eq("target_id", id).order("created_at", { ascending: false }).limit(15),
    db.from("order_clicks").select("id", { count: "exact", head: true }).eq("business_id", id).gte("created_at", since30),
  ]);
  const subs = (subsRaw ?? []) as unknown as Sub[];

  const current = subs.find((s) => s.status === "active" && !isPast(s.ends_at));
  const latest = subs.find((s) => s.status === "active");
  const currentPlan = one(current?.plans);
  const latestPlan = one(latest?.plans);
  const state = b.status === "suspended" ? "suspended" : current ? "active" : "expired";
  const defaultPlan = currentPlan?.id ?? plans?.[0]?.id;
  const nextStatus = b.status === "active" ? "suspended" : "active";
  const rel = b as unknown as { counties: Rel<{ name: string }>; business_categories: BusinessCategoriesRel };
  const cats = categoryNames(rel.business_categories);
  const openReports = (reports ?? []).filter((r) => r.status === "open");

  return (
    <>
      <header className={styles.head}>
        <p className={styles.sub}><Link href="/admin/businesses">Businesses</Link> / {b.name}</p>
        <h1 style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {b.name}
          {b.verified_at && <BadgeCheck size={22} color="var(--color-primary)" aria-label="Verified" />}
          <StatusPill kind={state} />
        </h1>
      </header>

      <div className={styles.two}>
        <section className={styles.panel}>
          <h2>Details</h2>
          <div className={styles.dl}>
            <div><span>Shop link</span><a href={`${site.url}/store/${b.slug}`} target="_blank" rel="noopener noreferrer" className={styles.mono}>/store/{b.slug} <ExternalLink size={12} aria-hidden="true" /></a></div>
            <div><span>Owner email</span><span>{owner.user?.email ?? "-"}</span></div>
            <div><span>County</span><span>{one(rel.counties)?.name ?? "-"}</span></div>
            <div><span>Location</span><span>{b.location}</span></div>
            <div><span>Categories</span><span>{cats.length ? cats.join(", ") : "-"}</span></div>
            <div><span>WhatsApp</span><span className={styles.mono}>{b.whatsapp}</span></div>
            <div><span>Products</span><span className={styles.mono}>{one(b.products as Rel<{ count: number }>)?.count ?? 0}{currentPlan?.product_limit ? ` / ${currentPlan.product_limit}` : ""}</span></div>
            <div><span>WhatsApp orders (30d)</span><span className={styles.mono}>{clicks30 ?? 0}</span></div>
            <div><span>Verified</span><span>{b.verified_at ? formatDate(b.verified_at) : "No"}</span></div>
            <div><span>Joined</span><span>{formatDate(b.created_at)}</span></div>
          </div>
          <div className={styles.btnRow} style={{ marginTop: 14 }}>
            <Button href={whatsappLink(b.whatsapp, `Hi ${b.name}, this is SokoBase.`)} external size="sm" variant="soft" icon={<MessageCircle size={15} />}>Message owner</Button>
            {latest && (
              <Button href={renewalReminderLink({ whatsapp: b.whatsapp, shopName: b.name, planName: latestPlan?.name, priceKes: latestPlan?.price_kes, endsAt: latest.ends_at })}
                external size="sm" variant="soft" icon={<BellRing size={15} />}>Send renewal reminder</Button>
            )}
            <form action={setVerified}>
              <input type="hidden" name="id" value={b.id} />
              <input type="hidden" name="verified" value={b.verified_at ? "0" : "1"} />
              {b.verified_at
                ? <ConfirmSubmit label="Remove verified badge" tone="neutral" />
                : <Button type="submit" size="sm" variant="outline" icon={<BadgeCheck size={15} />}>Mark as verified</Button>}
            </form>
            <form action={setBusinessStatus}>
              <input type="hidden" name="id" value={b.id} />
              <input type="hidden" name="status" value={nextStatus} />
              {b.status === "active"
                ? <ConfirmSubmit label="Suspend shop" question="Hide this shop from customers?" confirmLabel="Suspend" />
                : <Button type="submit" size="sm" variant="outline">Reactivate shop</Button>}
            </form>
          </div>
          <p className={styles.hint} style={{ marginTop: 10 }}>Verify a shop only after checking it is a real business (e.g. visited, or saw a permit or KRA PIN).</p>
        </section>

        <section className={styles.panel}>
          <h2>{current ? "Renew or change plan" : "Activate subscription"}</h2>
          <p className={styles.sub} style={{ marginBottom: 12 }}>
            {current
              ? `Active until ${formatDate(current.ends_at)}. A renewal starts when the current period ends.`
              : latest
                ? `Ended on ${formatDate(latest.ends_at)}. The shop stays visible for 7 days after the end date, then hides until renewed.`
                : "No subscription yet."}
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
            <div className={styles.grid2}>
              <label className={styles.field}>Amount paid (KSh) <span className={styles.hint}>(empty = plan price)</span><input type="number" name="amount_kes" min={0} max={1000000} /></label>
              <label className={styles.field}>Payment note <span className={styles.hint}>(M-Pesa code)</span><input name="payment_note" maxLength={120} /></label>
            </div>
          </ActionForm>
        </section>
      </div>

      <section className={styles.panel}>
        <h2>Subscription history</h2>
        {subs.length === 0 ? <p className={styles.empty}>No subscriptions yet.</p> : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Plan</th><th>Starts</th><th>Ends</th><th>Paid</th><th>Payment note</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {subs.map((s) => {
                  const live = s.status === "active" && !isPast(s.ends_at);
                  return (
                    <tr key={s.id}>
                      <td>{one(s.plans)?.name}</td>
                      <td>{formatDate(s.starts_at)}</td>
                      <td>{formatDate(s.ends_at)}</td>
                      <td className={styles.mono}>{s.amount_kes != null ? `KSh ${s.amount_kes.toLocaleString("en-KE")}` : "-"}</td>
                      <td className={styles.mono}>{s.payment_note ?? "-"}</td>
                      <td><StatusPill kind={s.status === "cancelled" ? "cancelled" : live ? "active" : isPast(s.ends_at) ? "expired" : "queued"} /></td>
                      <td>
                        {s.status === "active" && !isPast(s.ends_at) && (
                          <details className={styles.inlineEdit}>
                            <summary>Correct</summary>
                            <ActionForm action={setSubscriptionEnd} submitLabel="Set end date" variant="outline">
                              <input type="hidden" name="id" value={s.id} />
                              <input type="hidden" name="business_id" value={b.id} />
                              <label className={styles.field}>New end date<input type="date" name="ends_on" defaultValue={s.ends_at.slice(0, 10)} required /></label>
                            </ActionForm>
                            <form action={cancelSubscription} style={{ marginTop: 10 }}>
                              <input type="hidden" name="id" value={s.id} />
                              <input type="hidden" name="business_id" value={b.id} />
                              <ConfirmSubmit label="Cancel this period" question="Cancel this subscription period?" confirmLabel="Cancel it" />
                            </form>
                          </details>
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

      <section className={styles.panel}>
        <h2>Reports {openReports.length > 0 && <span className={styles.tag}>{openReports.length} open</span>}</h2>
        {(reports ?? []).length === 0 ? <p className={styles.empty}>No reports from customers.</p> : (
          <ul className={styles.list}>
            {(reports ?? []).map((r) => (
              <li key={r.id} className={styles.listItem}>
                <div>
                  <strong>{REPORT_REASONS[r.reason as keyof typeof REPORT_REASONS] ?? r.reason}</strong>
                  {r.product_id && <span className={styles.muted}> · {one(r.products as Rel<{ name: string }>)?.name ?? "Deleted product"}</span>}
                  <div className={styles.muted} style={{ fontSize: 12.5 }}>{formatDate(r.created_at)}{r.contact ? ` · Contact: ${r.contact}` : ""}</div>
                  {r.details && <p style={{ marginTop: 4 }}>{r.details}</p>}
                </div>
                <div className={styles.rowActions}>
                  <StatusPill kind={r.status as "open" | "resolved" | "dismissed"} />
                  {r.status === "open" && (
                    <>
                      <form action={resolveReport}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="status" value="resolved" /><Button type="submit" size="sm" variant="soft">Resolved</Button></form>
                      <form action={resolveReport}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="status" value="dismissed" /><Button type="submit" size="sm" variant="outline">Dismiss</Button></form>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.panel}>
        <h2>Products</h2>
        <p className={styles.sub} style={{ marginBottom: 10 }}>Hide a single listing (e.g. prohibited item) without suspending the shop. The owner sees it as a draft.</p>
        {(products ?? []).length === 0 ? <p className={styles.empty}>No products yet.</p> : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Product</th><th>Price</th><th>Stock</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {(products ?? []).map((p) => (
                  <tr key={p.id}>
                    <td>{p.status === "published" ? <a href={`${site.url}/products/${p.slug}`} target="_blank" rel="noopener noreferrer">{p.name}</a> : p.name}</td>
                    <td className={styles.mono}>{formatPrice(p.price == null ? null : Number(p.price), p.price_type as PriceType)}</td>
                    <td>{p.in_stock ? "In stock" : <span className={styles.muted}>Out</span>}</td>
                    <td><StatusPill kind={p.status as "draft" | "published"} /></td>
                    <td>
                      <form action={moderateProduct}>
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="status" value={p.status === "published" ? "draft" : "published"} />
                        {p.status === "published"
                          ? <ConfirmSubmit label="Unpublish" question="Hide this product?" confirmLabel="Hide" />
                          : <Button type="submit" size="sm" variant="outline">Publish</Button>}
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className={styles.two}>
        <section className={styles.panel}>
          <h2>Admin activity</h2>
          {(activity ?? []).length === 0 ? <p className={styles.empty}>No admin changes recorded yet.</p> : (
            <ul className={styles.list}>
              {(activity ?? []).map((a) => (
                <li key={a.id} className={styles.listItem}>
                  <span>{describeAudit(a.action, a.details as Record<string, unknown>)}</span>
                  <span className={styles.muted} style={{ fontSize: 12.5 }}>{formatDate(a.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={styles.panel}>
          <h2>Reset owner password</h2>
          <p className={styles.sub} style={{ marginBottom: 12 }}>Owners can now reset their own password by email from the sign-in page. Use this only if they can&apos;t access their email. Send the new password privately.</p>
          <ActionForm action={resetOwnerPassword} submitLabel="Set new password" resetOnSuccess variant="outline">
            <input type="hidden" name="business_id" value={b.id} />
            <label className={styles.field}>New password<input type="text" name="password" minLength={10} maxLength={72} autoComplete="off" required /></label>
          </ActionForm>
        </section>
      </div>
    </>
  );
}
