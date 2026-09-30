import styles from "./Skeleton.module.css";

export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <span className={`${styles.pulse} ${className ?? ""}`} style={style} aria-hidden="true" />;
}

export function ProductCardSkeleton() {
  return (
    <div className={styles.card}>
      <Skeleton className={styles.media} />
      <div className={styles.body}>
        <Skeleton className={styles.line} style={{ width: "90%" }} />
        <Skeleton className={styles.line} style={{ width: "60%" }} />
        <Skeleton className={styles.lineSm} style={{ width: "45%" }} />
      </div>
    </div>
  );
}

export function ProductGrid({ count = 8 }: { count?: number }) {
  return (
    <div className={styles.grid}>
      {Array.from({ length: count }, (_, i) => <ProductCardSkeleton key={i} />)}
    </div>
  );
}
