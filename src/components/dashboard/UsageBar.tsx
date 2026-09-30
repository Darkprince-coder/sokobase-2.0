import styles from "./dash.module.css";

export default function UsageBar({ count, limit }: { count: number; limit: number | null }) {
  if (limit === null) {
    return (
      <div className={styles.usage}>
        <div className={styles.usageTop}><span>Products used</span><span className={styles.mono}>{count} (unlimited plan)</span></div>
        <div className={styles.usageTrack}><div className={styles.usageFill} style={{ width: "6%" }} /></div>
      </div>
    );
  }
  const pct = Math.min(100, Math.round((count / Math.max(limit, 1)) * 100));
  const warn = count >= limit;
  return (
    <div className={styles.usage}>
      <div className={styles.usageTop}><span>Products used</span><span className={styles.mono}>{count} / {limit}</span></div>
      <div className={styles.usageTrack}><div className={`${styles.usageFill} ${warn ? styles.usageFillWarn : ""}`} style={{ width: `${pct}%` }} /></div>
    </div>
  );
}
