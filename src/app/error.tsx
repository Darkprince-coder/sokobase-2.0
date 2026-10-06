"use client";
import { useEffect } from "react";
import { RotateCw, TriangleAlert } from "lucide-react";
import Button from "@/components/Button";
import { reportError } from "@/lib/monitoring";
import styles from "@/components/StatusPage.module.css";

// Shown when a page fails to render (e.g. a network hiccup reaching the database). The rest of the
// app (header, navigation) keeps working, and "Try again" re-renders just this page.
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); reportError(error); }, [error]);
  return (
    <section className={`container ${styles.wrap}`}>
      <span className={`${styles.icon} ${styles.warn}`}><TriangleAlert size={30} aria-hidden="true" /></span>
      <h1>Something went wrong</h1>
      <p className={styles.text}>This page didn&rsquo;t load properly. Check your internet connection and try again.</p>
      <div className={styles.actions}>
        <Button type="button" onClick={reset} icon={<RotateCw size={16} />}>Try again</Button>
        <Button href="/" variant="soft">Go to home page</Button>
      </div>
      {error.digest && <p className={styles.digest}>Error reference: {error.digest}</p>}
    </section>
  );
}
