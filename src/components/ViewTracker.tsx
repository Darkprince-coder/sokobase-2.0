"use client";
import { useEffect } from "react";

export const LANDING_KEY = "sb-landing";
const here = () => window.location.pathname;

/** Remembers the first SokoBase page opened in this tab (called by SiteChrome and ViewTracker). */
export function rememberLanding() {
  try { if (!sessionStorage.getItem(LANDING_KEY)) sessionStorage.setItem(LANDING_KEY, here()); } catch {}
}

// Counts this page view for the seller's Insights (see /api/view). Fire-and-forget, after the page
// is interactive. The page a visit starts on reports where the visitor came from; any other page in
// the same tab counts as "browsing SokoBase" (client navigation keeps the original referrer).
// Comparing with the landing page (rather than "has anything run before") does not depend on the
// order in which effects run, which differs when parts of a page stream in later.
export default function ViewTracker({ businessId, productId }: { businessId: string; productId?: string }) {
  useEffect(() => {
    if (!businessId) return;
    rememberLanding();
    let internal = false;
    try { internal = sessionStorage.getItem(LANDING_KEY) !== here(); } catch {}
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
