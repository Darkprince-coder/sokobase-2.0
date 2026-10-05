"use client";
import { useState } from "react";
import { Check, Copy, MessageCircle } from "lucide-react";
import ShareButton from "@/components/ShareButton";
import QrPoster from "@/components/QrPoster";
import { whatsappLink } from "@/lib/site";
import styles from "./dash.module.css";

// Everything a seller needs to promote their shop link: copy/share it, a ready-made WhatsApp
// status / broadcast message, and a printable QR poster.
export default function ShareKit({ url, shopName }: { url: string; shopName: string }) {
  const [copied, setCopied] = useState<"" | "link" | "status">("");
  const statusText = `New: our shop is now online!\nSee all our products and prices, and order directly on WhatsApp:\n${url}`;

  const copy = async (text: string, which: "link" | "status") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(""), 2200);
    } catch {
      window.prompt("Copy this:", text);
    }
  };

  return (
    <>
      <div className={styles.linkRow}>
        <span className={styles.linkText}>{url.replace(/^https?:\/\//, "")}</span>
        <button type="button" className={`${styles.chip}`} onClick={() => copy(url, "link")} aria-live="polite">
          {copied === "link" ? <><Check size={14} aria-hidden="true" /> Copied</> : <><Copy size={14} aria-hidden="true" /> Copy link</>}
        </button>
        <ShareButton url={url} title={shopName} text={`Check out ${shopName} on SokoBase`} variant="solid" label="Share shop" />
      </div>

      <p className={styles.sub} style={{ marginBottom: 6 }}>Post this on your WhatsApp status, in groups or as a broadcast:</p>
      <p className={styles.statusText}>{statusText}</p>
      <div className={styles.btnRow} style={{ marginBottom: 18 }}>
        <button type="button" className={styles.chip} onClick={() => copy(statusText, "status")} aria-live="polite">
          {copied === "status" ? <><Check size={14} aria-hidden="true" /> Copied</> : <><Copy size={14} aria-hidden="true" /> Copy message</>}
        </button>
        <a className={styles.chip} href={whatsappLink("", statusText)} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
          <MessageCircle size={14} aria-hidden="true" /> Send on WhatsApp
        </a>
      </div>

      <QrPoster url={url} shopName={shopName} compact />
    </>
  );
}
