import { Flame, Tag, Sparkles } from "lucide-react";
import type { ProductBadge } from "@/lib/types";
import styles from "./Badge.module.css";

const MAP = {
  hot: { label: "Hot", Icon: Flame },
  offer: { label: "Offer", Icon: Tag },
  new: { label: "New", Icon: Sparkles },
} as const;

export default function Badge({ kind }: { kind: ProductBadge }) {
  const { label, Icon } = MAP[kind];
  return (
    <span className={`${styles.badge} ${styles[kind]}`}>
      <Icon size={12} aria-hidden="true" />
      {label}
    </span>
  );
}
