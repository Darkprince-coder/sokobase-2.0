import styles from "./admin.module.css";

const MAP = {
  active: ["Active", "status-available"],
  expired: ["Expired", "status-reserved"],
  suspended: ["Suspended", "status-sold"],
  unused: ["Unused", "status-available"],
  used: ["Used", "status-sold"],
  lapsed: ["Expired", "status-reserved"],
  cancelled: ["Cancelled", "status-sold"],
  queued: ["Starts later", "status-available"],
  open: ["Open", "status-reserved"],
  resolved: ["Resolved", "status-available"],
  dismissed: ["Dismissed", "status-sold"],
  draft: ["Hidden", "status-sold"],
  published: ["Live", "status-available"],
} as const;

export default function StatusPill({ kind }: { kind: keyof typeof MAP }) {
  const [label, cls] = MAP[kind];
  return <span className={`${styles.pill} ${cls}`}>{label}</span>;
}
