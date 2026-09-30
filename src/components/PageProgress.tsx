"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import styles from "./PageProgress.module.css";

// Thin bar at the top of the viewport during client-side navigations, so a slow page
// transition never reads as a frozen or broken app.
export default function PageProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 380);
    return () => clearTimeout(t);
  }, [pathname, searchParams]);

  if (!visible) return null;
  return <div className={styles.bar} aria-hidden="true" />;
}
