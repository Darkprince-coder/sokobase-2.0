import { describe, expect, it } from "vitest";
import { estimatedMrr, lapsedBetween, liveAt, monthlyValue, renewals, revenueBetween, trialConversion, type Sub } from "@/lib/platform-metrics";

const D = (s: string) => new Date(`${s}T00:00:00Z`).getTime();
const sub = (business_id: string, starts: string, ends: string, amount: number | null, status = "active", created = starts): Sub =>
  ({ business_id, status, starts_at: `${starts}T00:00:00Z`, ends_at: `${ends}T00:00:00Z`, amount_kes: amount, created_at: `${created}T00:00:00Z` });

describe("platform metrics", () => {
  const subs: Sub[] = [
    sub("a", "2026-09-01", "2026-10-01", 0),          // trial ...
    sub("a", "2026-10-01", "2026-10-31", 500),        // ... then paid: converted
    sub("b", "2026-09-10", "2026-10-10", 0),          // trial, never paid, lapsed
    sub("c", "2026-10-05", "2026-11-04", 1000),       // paid from the start
    sub("d", "2026-10-15", "2026-11-14", 0),          // trial still running
    sub("e", "2026-08-01", "2026-09-01", 500, "cancelled"),
  ];
  const now = D("2026-10-21");

  it("knows which shops are live, with the 7-day grace period", () => {
    expect([...liveAt(subs, now)].sort()).toEqual(["a", "c", "d"]);
    expect(liveAt(subs, D("2026-10-15")).has("b")).toBe(true); // ended 10 Oct, still in grace
    expect(liveAt(subs, D("2026-10-15"), false).has("b")).toBe(false);
  });

  it("spreads a plan's amount over 30 days", () => {
    expect(Math.round(monthlyValue(sub("x", "2026-01-01", "2026-04-01", 1500)))).toBe(500); // 90 days
  });

  it("estimates monthly revenue from running paid plans only", () => {
    expect(estimatedMrr(subs, now)).toEqual({ mrr: 1500, paying: 2, trial: 1 });
  });

  it("sums recorded payments in a window, ignoring cancelled ones", () => {
    expect(revenueBetween(subs, D("2026-10-01"), D("2026-11-01"))).toBe(1500);
    expect(revenueBetween(subs, D("2026-08-01"), D("2026-09-02"))).toBe(0);
  });

  it("measures how many finished trials became paid", () => {
    expect(trialConversion(subs, now)).toEqual({ trials: 2, converted: 1 }); // a converted, b did not; d still running
  });

  it("measures renewals of periods that ended in a window", () => {
    expect(renewals(subs, D("2026-09-25"), D("2026-10-12"))).toEqual({ due: 2, renewed: 1 }); // a renewed, b did not
  });

  it("finds shops that went hidden in a window", () => {
    expect(lapsedBetween(subs, D("2026-10-14"), D("2026-10-21"))).toEqual(["b"]); // ended 10 Oct + 7 days grace
  });
});
