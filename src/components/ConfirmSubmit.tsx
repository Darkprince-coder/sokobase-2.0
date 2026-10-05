"use client";
import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import styles from "./ConfirmSubmit.module.css";

type Props = { label: string; confirmLabel?: string; question?: string; tone?: "danger" | "neutral"; size?: "sm" | "md" };

// Submit button for destructive actions: the first tap asks "Are you sure?" inline, the second
// submits the surrounding <form>. Resets itself after a few seconds if not confirmed.
export default function ConfirmSubmit({ label, confirmLabel = "Yes, continue", question = "Are you sure?", tone = "danger", size = "sm" }: Props) {
  const [asking, setAsking] = useState(false);
  const { pending } = useFormStatus();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const ask = () => {
    setAsking(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setAsking(false), 6000);
  };
  const cls = `${styles.btn} ${styles[size]} ${tone === "danger" ? styles.danger : styles.neutral}`;

  if (pending) return <button type="button" className={cls} disabled><Loader2 size={14} className={styles.spin} aria-hidden="true" /> Working…</button>;
  if (!asking) return <button type="button" className={cls} onClick={ask}>{label}</button>;
  return (
    <span className={styles.ask} role="group" aria-label={question}>
      <span className={styles.q}>{question}</span>
      <button type="submit" className={`${cls} ${styles.confirm}`}>{confirmLabel}</button>
      <button type="button" className={`${styles.btn} ${styles[size]} ${styles.cancel}`} onClick={() => setAsking(false)}>Cancel</button>
    </span>
  );
}
