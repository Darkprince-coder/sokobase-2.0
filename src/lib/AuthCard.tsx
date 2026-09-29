import type { ReactNode } from "react";
import styles from "./AuthCard.module.css";

export default function AuthCard({ title, text, children }: { title: string; text?: string; children?: ReactNode }) {
  return (
    <section className={`container ${styles.wrap}`}>
      <div className={styles.card}>
        <h1>{title}</h1>
        {text && <p className={styles.text}>{text}</p>}
        {children}
      </div>
    </section>
  );
}
