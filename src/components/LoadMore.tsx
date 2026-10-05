import Link from "next/link";
import styles from "./LoadMore.module.css";

// "Load more" is a plain link to the next page (?page=N shows the first N pages), so it works
// without JavaScript, is crawlable, and the back button returns to the same spot.
export default function LoadMore({ shown, total, href }: { shown: number; total: number; href: string }) {
  if (shown >= total) return total > 0 ? <p className={styles.end}>Showing all {total}</p> : null;
  return (
    <div className={styles.wrap}>
      <p className={styles.count}>Showing {shown} of {total}</p>
      <Link href={href} scroll={false} className={styles.btn}>Load more</Link>
    </div>
  );
}
