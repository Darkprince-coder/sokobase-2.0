"use client";
import { createContext, useContext, type ReactNode } from "react";

export type CategoryLite = { id: string; slug: string; name: string; icon: string | null };
const Ctx = createContext<CategoryLite[]>([]);

// Categories are admin-managed (Admin > Categories) and fetched once in the root layout, then
// shared with every client component (header nav, sidebar, filters) through this context instead
// of each one re-fetching or falling back to a stale hardcoded list.
export function CategoriesProvider({ categories, children }: { categories: CategoryLite[]; children: ReactNode }) {
  return <Ctx.Provider value={categories}>{children}</Ctx.Provider>;
}

export function useCategories() {
  return useContext(Ctx);
}
