"use client";
import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import styles from "./ShareButton.module.css";

// Uses the phone's native share sheet (WhatsApp, Instagram, SMS...) when available, otherwise copies
// the link. The link always points at the public site, even when opened from the dashboard.
export default function ShareButton({ url, title, text, label = "Share", variant = "outline" }: { url: string; title: string; text?: string; label?: string; variant?: "outline" | "solid" }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    if (navigator.share) {
      try { await navigator.share({ title, text, url }); return; } catch (e) { if ((e as Error).name === "AbortError") return; }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      window.prompt("Copy this link:", url);
    }
  }

  return (
    <button type="button" onClick={share} className={variant === "solid" ? styles.solid : styles.btn} aria-live="polite">
      {copied ? <Check size={16} aria-hidden="true" /> : <Share2 size={16} aria-hidden="true" />}
      {copied ? "Link copied" : label}
    </button>
  );
}
