"use server";
import { z } from "zod";
import { getProductsByIds } from "@/lib/catalog";
import type { Product } from "@/lib/types";

const idsSchema = z.array(z.string().uuid()).max(100);

// Public, read-only: resolves wishlist ids (stored in the visitor's browser) to products.
export async function loadSavedProducts(ids: unknown): Promise<Product[]> {
  const parsed = idsSchema.safeParse(ids);
  if (!parsed.success) return [];
  return getProductsByIds(parsed.data);
}
