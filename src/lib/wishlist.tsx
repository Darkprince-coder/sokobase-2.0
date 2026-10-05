"use client";
import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";

const KEY = "sokobase:wishlist:v1";
type Ctx = { ids: string[]; count: number; ready: boolean; has: (id: string) => boolean; toggle: (id: string) => void };
const WishlistContext = createContext<Ctx | null>(null);

// localStorage is an external store: subscribe to it (including changes from other tabs) instead of
// copying it into state in an effect. The raw string is the snapshot, so unchanged data is a no-op.
const listeners = new Set<() => void>();
const readRaw = () => { try { return localStorage.getItem(KEY) ?? "[]"; } catch { return "[]"; } };
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) cb(); };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(cb); window.removeEventListener("storage", onStorage); };
};
const parse = (raw: string): string[] => {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch { return []; }
};
const noopSubscribe = () => () => {};

export function WishlistProvider({ children }: { children: ReactNode }) {
  const raw = useSyncExternalStore(subscribe, readRaw, () => "[]");
  // false during server render and hydration, true once running in the browser.
  const ready = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const ids = useMemo(() => parse(raw), [raw]);

  const toggle = useCallback((id: string) => {
    const prev = parse(readRaw());
    const next = prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev];
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
    listeners.forEach((l) => l());
  }, []);

  const value = useMemo<Ctx>(() => ({ ids, count: ids.length, ready, has: (id) => ids.includes(id), toggle }), [ids, ready, toggle]);
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used inside WishlistProvider");
  return ctx;
}
