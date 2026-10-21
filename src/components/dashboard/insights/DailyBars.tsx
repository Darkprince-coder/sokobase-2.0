"use client";
import { useState } from "react";
import styles from "./insights.module.css";

type Point = { day: string; value: number };

// Clean axis maximum (1, 2, 5 × 10^n) so tick labels are round numbers.
function niceMax(v: number) {
  if (v <= 4) return 4;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}
type Period = "day" | "week" | "month";
function label(day: string, long = false, period: Period = "day") {
  const d = new Date(`${day}T12:00:00Z`);
  if (period === "month") return d.toLocaleDateString("en-KE", long ? { month: "long", year: "numeric" } : { month: "short" });
  const text = d.toLocaleDateString("en-KE", long ? { weekday: "short", day: "numeric", month: "short" } : { day: "numeric", month: "short" });
  return period === "week" ? (long ? `Week ending ${text}` : text) : text;
}

// One series per chart (views and taps have different scales: two charts, never two axes).
export default function DailyBars({ title, data, color, unit, period = "day", money = false }: { title: string; data: Point[]; color: string; unit: [string, string]; period?: Period; money?: boolean }) {
  const [active, setActive] = useState<number | null>(null);
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const word = (n: number) => (money ? `KSh ${n.toLocaleString("en-KE")}` : `${n.toLocaleString("en-KE")} ${n === 1 ? unit[0] : unit[1]}`);
  const ticks = [max, max / 2, 0];
  const a = active === null ? null : data[active];

  return (
    <figure className={styles.chart}>
      <figcaption className={styles.chartTitle}>{title}</figcaption>
      <div className={styles.plot} onMouseLeave={() => setActive(null)}>
        <div className={styles.yAxis} aria-hidden="true">{ticks.map((t) => <span key={t}>{Number.isInteger(t) ? t.toLocaleString("en-KE") : ""}</span>)}</div>
        <div className={styles.area}>
          {ticks.map((t) => <span key={t} className={styles.grid} style={{ bottom: `${(t / max) * 100}%` }} aria-hidden="true" />)}
          <div className={styles.bars} role="list" aria-label={title}>
            {data.map((d, i) => (
              <div key={d.day} role="listitem" tabIndex={0} className={styles.slot} aria-label={`${label(d.day, true, period)}: ${word(d.value)}`}
                onMouseEnter={() => setActive(i)} onFocus={() => setActive(i)} onBlur={() => setActive(null)} onClick={() => setActive(i)}>
                <span className={styles.bar} style={{ height: `${(d.value / max) * 100}%`, background: color, opacity: active === null || active === i ? 1 : 0.45 }} />
              </div>
            ))}
          </div>
          {a && active !== null && (
            <div className={styles.tip} style={{ left: `${((active + 0.5) / data.length) * 100}%` }} role="status">
              <strong>{word(a.value)}</strong><span>{label(a.day, true, period)}</span>
            </div>
          )}
        </div>
      </div>
      <div className={styles.xAxis} aria-hidden="true">
        <span>{data[0] && label(data[0].day, false, period)}</span>
        {data.length > 2 && <span>{label(data[Math.floor(data.length / 2)].day, false, period)}</span>}
        <span>{data.length > 1 && label(data[data.length - 1].day, false, period)}</span>
      </div>
      <details className={styles.tableToggle}>
        <summary>Show as table</summary>
        <table className={styles.table}>
          <thead><tr><th scope="col">{period === "month" ? "Month" : period === "week" ? "Week" : "Day"}</th><th scope="col">{unit[1][0].toUpperCase() + unit[1].slice(1)}</th></tr></thead>
          <tbody>{data.map((d) => <tr key={d.day}><td>{label(d.day, true, period)}</td><td>{d.value.toLocaleString("en-KE")}</td></tr>)}</tbody>
        </table>
      </details>
    </figure>
  );
}
