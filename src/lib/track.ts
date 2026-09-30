"use client";
// Fire-and-forget click logging. Never blocks or delays opening WhatsApp.
export function logOrderClick(businessId: string, productId?: string) {
  if (!businessId) return;
  try {
    fetch("/api/order-click", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, productId }), keepalive: true,
    }).catch(() => {});
  } catch {}
}
