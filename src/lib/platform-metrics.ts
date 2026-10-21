// Subscription-based platform metrics for Admin > Insights. Pure (no database), so every rule is
// unit-tested. A shop is "live" while an active subscription covers the moment, plus the 7-day
// grace period after it ends (same rule as business_is_public in 0007).
export type Sub = { business_id: string; status: string; starts_at: string; ends_at: string; amount_kes: number | null; created_at: string };

const DAY = 86400000;
export const GRACE_MS = 7 * DAY;
const t = (iso: string) => new Date(iso).getTime();
const active = (subs: Sub[]) => subs.filter((s) => s.status === "active");

/** Shops live at a moment (active sub covering it, including grace). */
export function liveAt(subs: Sub[], at: number, includeGrace = true): Set<string> {
  const out = new Set<string>();
  for (const s of active(subs)) {
    if (t(s.starts_at) <= at && at < t(s.ends_at) + (includeGrace ? GRACE_MS : 0)) out.add(s.business_id);
  }
  return out;
}

/** Monthly-equivalent value of a subscription period (amount spread over 30 days). */
export function monthlyValue(s: Sub): number {
  const days = Math.max(1, Math.round((t(s.ends_at) - t(s.starts_at)) / DAY));
  return ((s.amount_kes ?? 0) / days) * 30;
}

/**
 * Estimated monthly recurring revenue: for each shop with a paid plan running right now (not in
 * grace), the monthly value of the period covering now. Free trials count as 0.
 */
export function estimatedMrr(subs: Sub[], now: number): { mrr: number; paying: number; trial: number } {
  const current = new Map<string, Sub>();
  for (const s of active(subs)) {
    if (t(s.starts_at) <= now && now < t(s.ends_at)) {
      const prev = current.get(s.business_id);
      if (!prev || t(s.starts_at) > t(prev.starts_at)) current.set(s.business_id, s);
    }
  }
  let mrr = 0, paying = 0, trial = 0;
  for (const s of current.values()) {
    if ((s.amount_kes ?? 0) > 0) { paying++; mrr += monthlyValue(s); } else trial++;
  }
  return { mrr: Math.round(mrr), paying, trial };
}

/** Money recorded (subscription amounts) between two moments, by when the payment was recorded. */
export function revenueBetween(subs: Sub[], from: number, to: number): number {
  return subs.filter((s) => s.status !== "cancelled" && t(s.created_at) >= from && t(s.created_at) < to)
    .reduce((n, s) => n + (s.amount_kes ?? 0), 0);
}

/** Of shops whose first period was a free trial that has ended, how many later paid. */
export function trialConversion(subs: Sub[], now: number): { trials: number; converted: number } {
  const byShop = new Map<string, Sub[]>();
  for (const s of subs.filter((x) => x.status !== "cancelled")) byShop.set(s.business_id, [...(byShop.get(s.business_id) ?? []), s]);
  let trials = 0, converted = 0;
  for (const list of byShop.values()) {
    const sorted = [...list].sort((a, b) => t(a.starts_at) - t(b.starts_at));
    const first = sorted[0];
    if ((first.amount_kes ?? 0) > 0 || t(first.ends_at) > now) continue; // not a trial, or still running
    trials++;
    if (sorted.slice(1).some((s) => (s.amount_kes ?? 0) > 0)) converted++;
  }
  return { trials, converted };
}

/**
 * Renewal rate: of shops whose latest period ended (past its grace) in the window, how many have a
 * newer period. A shop counts once, by its period that ended in the window.
 */
export function renewals(subs: Sub[], from: number, to: number): { due: number; renewed: number } {
  const act = active(subs);
  const due = new Map<string, Sub>();
  for (const s of act) {
    const end = t(s.ends_at);
    if (end >= from && end < to) {
      const prev = due.get(s.business_id);
      if (!prev || end > t(prev.ends_at)) due.set(s.business_id, s);
    }
  }
  let renewed = 0;
  for (const [id, s] of due) {
    if (act.some((x) => x.business_id === id && t(x.ends_at) > t(s.ends_at))) renewed++;
  }
  return { due: due.size, renewed };
}

/** Shops that went hidden (latest period plus grace ended) between two moments and were not renewed. */
export function lapsedBetween(subs: Sub[], from: number, to: number): string[] {
  const latest = new Map<string, number>();
  for (const s of active(subs)) latest.set(s.business_id, Math.max(latest.get(s.business_id) ?? 0, t(s.ends_at)));
  return [...latest].filter(([, end]) => end + GRACE_MS >= from && end + GRACE_MS < to).map(([id]) => id);
}

/** First subscription per shop (= when it was approved / joined with an invite). */
export function firstSubs(subs: Sub[]): Map<string, Sub> {
  const first = new Map<string, Sub>();
  for (const s of subs) {
    const prev = first.get(s.business_id);
    if (!prev || t(s.created_at) < t(prev.created_at)) first.set(s.business_id, s);
  }
  return first;
}
