import "server-only";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireBusiness } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionState } from "@/lib/action-state";

export type { ActionState };
export const fail = (error: string): ActionState => ({ error });
export const done = (message: string, data?: Record<string, string>): ActionState => ({ ok: true, message, data });

export async function bizDb() {
  const { supabase, user, business } = await requireBusiness();
  if (!business) redirect("/dashboard");
  return { db: supabase, user, business };
}

export const refreshDashboard = () => revalidatePath("/dashboard", "layout");

// Public pages are cached, so every change a business makes must also refresh where it shows up:
// the home feed, product listings, the shop page and (when known) the product page itself.
export function refreshShop(shopSlug: string, productSlugs: string[] = []) {
  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/stores");
  revalidatePath(`/store/${shopSlug}`);
  for (const s of productSlugs) revalidatePath(`/products/${s}`);
}

export function readableDbError(message: string | undefined, code: string | undefined): string {
  if (message?.includes("Product limit reached")) return message;
  if (code === "42501" || code === "P0001") return "Your subscription is not active, so changes cannot be saved. Contact SokoBase to renew.";
  return "Something went wrong. Please try again.";
}

export async function getPlanUsage(db: Awaited<ReturnType<typeof bizDb>>["db"], businessId: string) {
  const [{ count }, { data: sub }] = await Promise.all([
    db.from("products").select("id", { count: "exact", head: true }).eq("business_id", businessId),
    db.from("subscriptions").select("status, ends_at, plans(name, product_limit)").eq("business_id", businessId)
      .order("ends_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const plan = Array.isArray(sub?.plans) ? sub?.plans[0] : sub?.plans;
  const live = !!sub && sub.status === "active" && new Date(sub.ends_at).getTime() > Date.now();
  return { count: count ?? 0, limit: plan?.product_limit ?? null, planName: plan?.name ?? null, live, endsAt: sub?.ends_at ?? null };
}

// order_clicks is service-role only (see 0002_rls_and_grants.sql). This is the single narrow
// place that reads it for a dashboard, always scoped to the business the caller was verified to own.
export async function getOrderClicks30(businessId: string): Promise<number> {
  const db = createAdminClient();
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const { count } = await db.from("order_clicks").select("id", { count: "exact", head: true }).eq("business_id", businessId).gte("created_at", since);
  return count ?? 0;
}
