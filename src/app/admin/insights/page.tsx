import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { adminDb } from "@/lib/admin";
import { change, RANGES, type Range } from "@/lib/insights";
import { SOURCE_LABELS } from "@/lib/insights-source";
import { getPlatformInsights } from "@/lib/platform-insights";
import { site, whatsappLink } from "@/lib/site";
import DailyBars from "@/components/dashboard/insights/DailyBars";
import admin from "@/components/admin/admin.module.css";
import styles from "@/components/dashboard/insights/insights.module.css";

export const metadata: Metadata = { title: "Insights" };

const fmt = (n: number) => n.toLocaleString("en-KE");
const kes = (n: number) => `KSh ${fmt(Math.round(n))}`;
const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : "–");

function Delta({ now, before, days }: { now: number; before: number; days: number }) {
  const c = change(now, before);
  if (c === null) return <span className={styles.kpiChange}>Nothing in the {days} days before</span>;
  if (c === 0) return <span className={styles.kpiChange}>Same as the {days} days before</span>;
  return <span className={styles.kpiChange}><span className={c > 0 ? styles.up : styles.down}>{c > 0 ? "▲" : "▼"} {Math.abs(c)}%</span> vs the {days} days before</span>;
}

function Kpi({ label, value, note }: { label: string; value: string; note?: React.ReactNode }) {
  return (
    <div className={styles.kpi}>
      <span className={styles.kpiLabel}>{label}</span>
      <span className={styles.kpiNum}>{value}</span>
      {note && (typeof note === "string" ? <span className={styles.kpiChange}>{note}</span> : note)}
    </div>
  );
}

function ShopList({ title, hint, shops, message }: { title: string; hint: string; shops: { id: string; name: string; slug: string; whatsapp: string }[]; message: (shop: { name: string; slug: string }) => string }) {
  return (
    <div>
      <h3 style={{ fontSize: 15, marginBottom: 2 }}>{title} <span className={admin.muted}>({shops.length})</span></h3>
      <p className={admin.sub} style={{ marginTop: 0, marginBottom: 8 }}>{hint}</p>
      {shops.length === 0 ? <p className={admin.empty}>None. Nice.</p> : (
        <ul className={admin.list}>
          {shops.slice(0, 15).map((s) => (
            <li key={s.id} className={admin.listItem}>
              <Link href={`/admin/businesses/${s.id}`}><strong>{s.name}</strong></Link>
              <a href={whatsappLink(s.whatsapp, message(s))} target="_blank" rel="noopener noreferrer" className={admin.signupChat} style={{ padding: "5px 12px", fontSize: 12.5 }}>
                <MessageCircle size={14} aria-hidden="true" /> Nudge
              </a>
            </li>
          ))}
        </ul>
      )}
      {shops.length > 15 && <p className={admin.muted} style={{ fontSize: 13 }}>…and {shops.length - 15} more.</p>}
    </div>
  );
}

export default async function PlatformInsightsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  await adminDb();
  const asked = Number((await searchParams).days);
  const days: Range = (RANGES as readonly number[]).includes(asked) ? (asked as Range) : 30;
  const d = await getPlatformInsights(days);
  const { growth: g, money: m, demand: q, attention: a } = d;
  const sourceTotal = q.sources.reduce((n, s) => n + s.n, 0);
  const shopLink = (slug: string) => `${site.url}/store/${slug}`;
  type S = { name: string; slug: string };

  return (
    <>
      <header className={admin.head} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1>Insights</h1>
          <p className={admin.sub}>How SokoBase is growing, earning and serving buyers. Views count once per visitor per page per day{d.viewsSince ? `; counted since ${new Date(`${d.viewsSince}T12:00:00Z`).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}` : ""}.</p>
        </div>
        <nav className={styles.ranges} aria-label="Time range">
          {RANGES.map((r) => (
            <Link key={r} href={r === 30 ? "/admin/insights" : `/admin/insights?days=${r}`} className={`${styles.range} ${r === days ? styles.rangeOn : ""}`} aria-current={r === days ? "page" : undefined}>{r} days</Link>
          ))}
        </nav>
      </header>

      {/* ---------- Growth ---------- */}
      <section className={admin.panel}>
        <h2>Growth</h2>
        <div className={styles.kpis} style={{ marginTop: 10 }}>
          <Kpi label="Live shops" value={fmt(g.liveNow)} note={<Delta now={g.liveNow} before={g.liveStart} days={days} />} />
          <Kpi label={`New sign-ups (${days} days)`} value={fmt(g.signups)} note={<Delta now={g.signups} before={g.signupsBefore} days={days} />} />
          <Kpi label={`Shops approved or joined (${days} days)`} value={fmt(g.approvals)} note={<Delta now={g.approvals} before={g.approvalsBefore} days={days} />} />
          <Kpi label="Live products" value={fmt(g.products)} note={g.pending > 0 ? <Link href="/admin/signups" className={styles.kpiChange}>{g.pending} sign-up{g.pending === 1 ? "" : "s"} waiting →</Link> : `${g.lapsed} shop${g.lapsed === 1 ? "" : "s"} lapsed in ${days} days`} />
        </div>
        <div className={styles.charts}>
          <DailyBars title="Live shops, weekly (last 12 weeks)" data={g.liveByWeek} color="#1F7A4D" unit={["shop", "shops"]} period="week" />
          <DailyBars title="New sign-ups per week" data={g.signupsByWeek} color="#1F7A4D" unit={["sign-up", "sign-ups"]} period="week" />
        </div>
      </section>

      {/* ---------- Money ---------- */}
      <section className={admin.panel}>
        <h2>Money</h2>
        <div className={styles.kpis} style={{ marginTop: 10 }}>
          <Kpi label={`Payments recorded (${days} days)`} value={kes(m.revenue)} note={<Delta now={m.revenue} before={m.revenueBefore} days={days} />} />
          <Kpi label="Estimated monthly revenue" value={kes(m.mrr)} note={`${m.paying} paying · ${m.trial} on free trial`} />
          <Kpi label="Free trials that became paid" value={pct(m.conversion.converted, m.conversion.trials)} note={`${m.conversion.converted} of ${m.conversion.trials} finished trials`} />
          <Kpi label="Renewal rate (last 90 days)" value={pct(m.renewals.renewed, m.renewals.due)} note={`${m.renewals.renewed} of ${m.renewals.due} renewed`} />
        </div>
        <DailyBars title="Payments recorded per month" data={m.months} color="#1F7A4D" unit={["", ""]} period="month" money />
        <p className={styles.hint}>Estimated monthly revenue spreads each running paid plan over 30 days. Payments are counted when you record them in Admin.</p>
      </section>

      {/* ---------- Buyer demand ---------- */}
      <section className={admin.panel}>
        <h2>Buyer demand</h2>
        <div className={styles.kpis} style={{ marginTop: 10 }}>
          <Kpi label={`Page views (${days} days)`} value={fmt(q.now.views)} note={<Delta now={q.now.views} before={q.before.views} days={days} />} />
          <Kpi label="Daily visitors (average)" value={fmt(Math.round(q.now.visitors / days))} note={<Delta now={q.now.visitors} before={q.before.visitors} days={days} />} />
          <Kpi label={`WhatsApp order taps (${days} days)`} value={fmt(q.now.clicks)} note={<Delta now={q.now.clicks} before={q.before.clicks} days={days} />} />
          <Kpi label="Order rate (taps ÷ product views)" value={pct(q.now.clicks, q.now.productViews)} note={`Before: ${pct(q.before.clicks, q.before.productViews)}`} />
        </div>
        <div className={styles.charts}>
          <DailyBars title="Page views per day" data={q.daily.map((x) => ({ day: x.day, value: x.views }))} color="#1F7A4D" unit={["view", "views"]} />
          <DailyBars title="WhatsApp order taps per day" data={q.daily.map((x) => ({ day: x.day, value: x.clicks }))} color="#C97A2B" unit={["tap", "taps"]} />
        </div>
        <h3 style={{ fontSize: 15, margin: "18px 0 10px" }}>Where buyers come from</h3>
        {q.sources.length === 0 ? <p className={admin.empty}>No views recorded yet in this period.</p> : (
          <div className={styles.sources}>
            {q.sources.map((s) => (
              <div key={s.source} className={styles.source}>
                <span>{SOURCE_LABELS[s.source] ?? s.source}</span>
                <span className={styles.sourceTrack} aria-hidden="true"><span className={styles.sourceBar} style={{ display: "block", width: `${Math.max(2, (s.n / Math.max(1, q.sources[0].n)) * 100)}%` }} /></span>
                <span className={styles.sourceNum}>{fmt(s.n)} · {pct(s.n, sourceTotal)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ---------- What's working ---------- */}
      <section className={admin.panel}>
        <h2>What&apos;s working</h2>
        <div className={styles.charts} style={{ marginTop: 10 }}>
          <div className={styles.tableWrap}>
            <h3 style={{ fontSize: 15, marginBottom: 8 }}>Top shops</h3>
            <table className={styles.products}>
              <thead><tr><th scope="col">Shop</th><th scope="col" className={styles.num}>Views</th><th scope="col" className={styles.num}>Taps</th><th scope="col" className={styles.num}>Rate</th></tr></thead>
              <tbody>
                {q.topShops.length === 0 ? <tr><td colSpan={4} className={admin.muted}>No activity yet.</td></tr> : q.topShops.map((s) => (
                  <tr key={s.id}><td><Link href={`/admin/businesses/${s.id}`} className={styles.productName}>{s.name}</Link></td><td className={styles.num}>{fmt(s.views)}</td><td className={styles.num}>{fmt(s.clicks)}</td><td className={styles.num}>{pct(s.clicks, s.views)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.tableWrap}>
            <h3 style={{ fontSize: 15, marginBottom: 8 }}>Top categories</h3>
            <table className={styles.products}>
              <thead><tr><th scope="col">Category</th><th scope="col" className={styles.num}>Views</th><th scope="col" className={styles.num}>Taps</th><th scope="col" className={styles.num}>Rate</th></tr></thead>
              <tbody>
                {q.categories.length === 0 ? <tr><td colSpan={4} className={admin.muted}>No activity yet.</td></tr> : q.categories.map((c) => (
                  <tr key={c.name}><td>{c.name}</td><td className={styles.num}>{fmt(c.views)}</td><td className={styles.num}>{fmt(c.clicks)}</td><td className={styles.num}>{pct(c.clicks, c.views)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <h3 style={{ fontSize: 15, margin: "18px 0 8px" }}>Top products</h3>
        <div className={styles.tableWrap}>
          <table className={styles.products}>
            <thead><tr><th scope="col">Product</th><th scope="col">Shop</th><th scope="col" className={styles.num}>Views</th><th scope="col" className={styles.num}>Taps</th></tr></thead>
            <tbody>
              {q.products.length === 0 ? <tr><td colSpan={4} className={admin.muted}>No activity yet.</td></tr> : q.products.map((p) => (
                <tr key={p.product_id}><td><a href={`${site.url}/products/${p.slug}`} target="_blank" rel="noopener noreferrer" className={styles.productName}>{p.name}</a></td><td className={admin.muted}>{p.shop}</td><td className={styles.num}>{fmt(p.views)}</td><td className={styles.num}>{fmt(p.clicks)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---------- Needs attention ---------- */}
      <section className={admin.panel}>
        <h2>Needs attention</h2>
        <p className={admin.sub} style={{ marginBottom: 12 }}>
          Live shops that may not get value from SokoBase, and so may not renew. A quick WhatsApp nudge helps.
          {a.openReports > 0 && <> · <Link href="/admin/reports">{a.openReports} open report{a.openReports === 1 ? "" : "s"}</Link></>}
          {a.pending > 0 && <> · <Link href="/admin/signups">{a.pending} sign-up{a.pending === 1 ? "" : "s"} waiting</Link></>}
        </p>
        <div className={styles.charts}>
          {d.viewsCoverRange ? (
            <ShopList title={`No views in ${days} days`} hint="Nobody opened their shop or products. They need to share their link." shops={a.noViews}
              message={(s: S) => `Hi, this is SokoBase. Your shop ${s.name} hasn't had visitors lately. Share your link on WhatsApp Status to bring customers: ${shopLink(s.slug)}`} />
          ) : (
            <div>
              <h3 style={{ fontSize: 15, marginBottom: 2 }}>No views in {days} days</h3>
              <p className={admin.sub} style={{ marginTop: 0 }}>Shows up once views have been counted for the whole {days} days{d.viewsSince ? "" : " (counting starts when the latest update is live)"}. Try a shorter range.</p>
            </div>
          )}
          <ShopList title="Fewer than 3 products" hint="Shops with more products get far more orders." shops={a.fewProducts}
            message={(s: S) => `Hi, this is SokoBase. Customers love choice: add a few more products to ${s.name} and you'll get more orders. Need help? Reply here.`} />
          <ShopList title="No product updates in 30 days" hint="Prices and stock may be out of date." shops={a.stale}
            message={(s: S) => `Hi, this is SokoBase. Quick reminder to update the prices and stock in ${s.name} so customers see what's available.`} />
        </div>
      </section>
    </>
  );
}
