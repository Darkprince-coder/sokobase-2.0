"use client";
import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import styles from "./OfflineBanner.module.css";

export default function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);
  return (
    offline ? (
      <div className={styles.banner} role="status">
        <WifiOff size={18} aria-hidden="true" />
        You are offline. Prices and stock may be out of date.
      </div>
    ) : null
  );
}
