import type { ReactNode } from "react";
import styles from "./InfoPage.module.css";

// Shared layout for text pages (About, Privacy, Terms, Contact).
export default function InfoPage({ title, intro, updated, children }: { title: string; intro?: string; updated?: string; children: ReactNode }) {
  return (
    <article className={`container ${styles.page}`}>
      <header className={styles.head}>
        <h1>{title}</h1>
        {intro && <p className={styles.intro}>{intro}</p>}
        {updated && <p className={styles.updated}>Last updated: {updated}</p>}
      </header>
      <div className={styles.prose}>{children}</div>
    </article>
  );
}
