import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Lightbulb, Share2 } from "lucide-react";
import { requireBusiness } from "@/lib/auth";
import { change, getInsights, RANGES, type Range, type Totals } from "@/lib/insights";
import { SOURCE_LABELS } from "@/lib/insights-source";
import { site } from "@/lib/site";
import { setWeeklyReport } from "@/app/dashboard/actions";
import DailyBars from "@/components/dashboard/insights/DailyBars";
import Button from "@/components/Button";
import dash from "@/components/dashboard/dash.module.css";
import styles from "@/components/dashboard/insights/insights.module.css";

export const metadata: Metadata = { title: "Insights" };

const fmt = (n: number) => n.toLocaleString("en-KE");
const rate = (taps: number, views: number) => (views > 0 ? `${Math.round((taps / views) * 100)}%` : "–");

function Kpi({ label, now, before, days, isRate }: { label: string; now: number; before: number; days: number; isRate?: string }) {
  const pct = change(now, before);
  return (
    <div className={styles.kpi}>
      <span className={styles.kpiLabel}>{label}</span>
      <span className={styles.kpiNum}>{isRate ?? fmt(now)}</span>
      {!isRate && (
        <span className={styles.kpiChange}>
          {pct === null ? `New this ${days === 7 ? "week" : "period"}` : pct === 0 ? `Same as the ${days} days before`
            : <><span className={pct > 0 ? styles.up : styles.down}>{pct > 0 ? "▲" : "▼"} {Math.abs(pct)}%</span> vs the {days} days before</>}
        </span>
      )}
    </div>
  );
}

function tips(d: Awaited<ReturnType<typeof getInsights>>, t: Totals) {
  const out: string[] = [];
  const published = d.products.filter((p) => p.status === "published");
  const noTaps = published.filter((p) => p.views >= 10 && p.clicks === 0).slice(0, 2);
  for (const p of noTaps) out.push(`“${p.name}” was viewed ${fmt(p.views)} times but nobody tapped Order. Check the price, add clearer photos, or mention delivery in the description.`);
  const unseen = published.filter((p) => p.views === 0).length;
  if (t.productViews > 0 && unseen > 0) out.push(`${unseen} of your products had no views. Share them on your WhatsApp Status or in groups to get them seen.`);
  const top = d.sources[0];
  if (top?.source === "direct" || top?.source === "whatsapp") out.push("Most visitors come from links you share. Posting your shop link on WhatsApp Status a few times a week keeps customers coming.");
  if (top?.source === "google") out.push("Many visitors find you on Google. Clear product names and descriptions help you show up more.");
  const best = published.find((p) => p.clicks > 0);
  if (best) out.push(`“${best.name}” gets the most orders. Keep it in stock and consider adding similar items.`);
  return out.slice(0, 4);
}

export default async function InsightsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { supabase, business } = await requireBusiness();
  if (!business) return null;
  const asked = Number((await searchParams).days);
  const days: Range = (RANGES as readonly number[]).includes(asked) ? (asked as Range) : 7;

  const [d, { data: prefs }] = await Promise.all([
    getInsights(business.id, days),
    supabase.from("businesses").select("weekly_report").eq("id", business.id).maybeSingle(),
  ]);
  const t = d.now;
  const views = t.shopViews + t.productViews;
  const anything = views + t.clicks > 0;
  const sourceTotal = d.sources.reduce((n, s) => n + s.n, 0);
  const advice = tips(d, t);
  const weeklyOn = prefs?.weekly_report !== false;

  return (
    <>
      <header className={dash.head}>
        <div>
          <h1>Insights</h1>
          <p className={dash.sub}>How customers find your shop and what they order. Each visitor is counted once per page per day.</p>
        </div>
        <nav className={styles.ranges} aria-label="Time range">
          {RANGES.map((r) => (
            <Link key={r} href={r === 7 ? "/dashboard/insights" : `/dashboard/insights?days=${r}`} className={`${styles.range} ${r === days ? styles.rangeOn : ""}`} aria-current={r === days ? "page" : undefined}>
              {r} days
            </Link>
          ))}
        </nav>
      </header>

      <div className={styles.kpis}>
        <Kpi label="Shop page visits" now={t.shopViews} before={d.before.shopViews} days={days} />
        <Kpi label="Product views" now={t.productViews} before={d.before.productViews} days={days} />
        <Kpi label="WhatsApp order taps" now={t.clicks} before={d.before.clicks} days={days} />
        <Kpi label="Order rate (taps ÷ product views)" now={0} before={0} days={days} isRate={rate(t.clicks, t.productViews)} />
      </div>

      {!anything ? (
        <section className={dash.panel}>
          <div className={styles.empty}>
            <Share2 size={28} aria-hidden="true" />
            <strong>No visits in the last {days} days yet</strong>
            <span>Share your shop link on WhatsApp Status, in groups and on social media. Your numbers will show up here.</span>
            <Button href="/dashboard" size="sm">Get my shop link</Button>
          </div>
        </section>
      ) : (
        <>
          {advice.length > 0 && (
            <section className={dash.panel}>
              <h2>Tips for you</h2>
              <ul className={styles.tips} style={{ marginTop: 10 }}>
                {advice.map((a) => <li key={a}><Lightbulb size={16} aria-hidden="true" />{a}</li>)}
              </ul>
            </section>
          )}

          <section className={dash.panel}>
            <div className={styles.charts}>
              <DailyBars title="Visits per day (shop + products)" data={d.daily.map((x) => ({ day: x.day, value: x.views }))} color="#1F7A4D" unit={["visit", "visits"]} />
              <DailyBars title="WhatsApp order taps per day" data={d.daily.map((x) => ({ day: x.day, value: x.clicks }))} color="#C97A2B" unit={["tap", "taps"]} />
            </div>
          </section>

          <section className={dash.panel}>
            <h2>Where visitors come from</h2>
            <div className={styles.sources} style={{ marginTop: 12 }}>
              {d.sources.map((s) => (
                <div key={s.source} className={styles.source}>
                  <span>{SOURCE_LABELS[s.source] ?? s.source}</span>
                  <span className={styles.sourceTrack} aria-hidden="true"><span className={styles.sourceBar} style={{ display: "block", width: `${Math.max(2, (s.n / Math.max(1, d.sources[0].n)) * 100)}%` }} /></span>
                  <span className={styles.sourceNum}>{fmt(s.n)} · {Math.round((s.n / Math.max(1, sourceTotal)) * 100)}%</span>
                </div>
              ))}
            </div>
            <p className={styles.hint}>&ldquo;Direct and chat links&rdquo; includes links opened from WhatsApp chats and SMS, which don&apos;t say where they came from.</p>
          </section>
        </>
      )}

      <section className={dash.panel}>
        <h2>Your products</h2>
        <p className={dash.sub} style={{ marginBottom: 12 }}>Last {days} days, most viewed first.</p>
        {d.products.length === 0 ? <p className={dash.sub}>No products yet. <Link href="/dashboard/products/new">Add your first product</Link>.</p> : (
          <div className={styles.tableWrap}>
            <table className={styles.products}>
              <thead><tr><th scope="col">Product</th><th scope="col" className={styles.num}>Views</th><th scope="col" className={styles.num}>Order taps</th><th scope="col" className={styles.num}>Rate</th></tr></thead>
              <tbody>
                {d.products.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className={styles.productCell}>
                        {p.image ? <Image src={`${p.image}#fill`} alt="" width={40} height={40} /> : <span className={styles.noImg} aria-hidden="true" />}
                        <div style={{ minWidth: 0 }}>
                          {p.status === "published"
                            ? <a className={styles.productName} href={`${site.url}/products/${p.slug}`} target="_blank" rel="noopener noreferrer">{p.name}</a>
                            : <span className={styles.productName}>{p.name}</span>}
                          {p.status !== "published" && <span className={styles.tag}>Draft</span>}
                        </div>
                      </div>
                    </td>
                    <td className={styles.num}>{fmt(p.views)}</td>
                    <td className={styles.num}>{fmt(p.clicks)}</td>
                    <td className={styles.num}>{rate(p.clicks, p.views)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={dash.panel}>
        <form action={setWeeklyReport} className={styles.weekly}>
          <div>
            <h2>Weekly email</h2>
            <p className={dash.sub}>{weeklyOn ? "Every Monday morning we email you last week's visits, order taps and top products." : "Weekly emails are off."}</p>
          </div>
          <input type="hidden" name="on" value={weeklyOn ? "0" : "1"} />
          <Button type="submit" size="sm" variant="outline">{weeklyOn ? "Turn off" : "Turn on"}</Button>
        </form>
      </section>
    </>
  );
}
