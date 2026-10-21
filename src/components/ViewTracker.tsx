"use client";
import { useEffect } from "react";

const LANDED_KEY = "sb-landed";

// Counts this page view for the seller's Insights (see /api/view). Fire-and-forget, after the page
// is interactive. The first page of a visit reports where the visitor came from; later pages in the
// same tab count as "browsing SokoBase" (client navigation keeps the original referrer).
export default function ViewTracker({ businessId, productId }: { businessId: string; productId?: string }) {
  useEffect(() => {
    if (!businessId) return;
    let internal = false;
    try {
      internal = sessionStorage.getItem(LANDED_KEY) === "1";
      sessionStorage.setItem(LANDED_KEY, "1");
    } catch {}
    const src = new URLSearchParams(window.location.search).get("src") ?? undefined;
    const send = () => {
      fetch("/api/view", {
        method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true,
        body: JSON.stringify({ businessId, productId, internal, referrer: internal ? undefined : document.referrer || undefined, src }),
      }).catch(() => {});
    };
    const t = window.setTimeout(send, 1500); // skip bounces and prefetch-like flashes
    return () => window.clearTimeout(t);
  }, [businessId, productId]);
  return null;
}
