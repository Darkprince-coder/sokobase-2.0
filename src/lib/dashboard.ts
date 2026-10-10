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
  // P0001 is raised by our own triggers/functions with a message written for the user.
  if (code === "P0001" && message) return message;
  if (code === "P0002") return "That product no longer exists.";
  if (code === "42501") return "Your subscription is not active, so changes cannot be saved. Contact SokoBase to renew.";
  if (code === "23503") return "One of the selected options no longer exists. Refresh the page and try again.";
  return "Something went wrong. Please try again.";
}

// Keep in sync with business_is_public() in 0007_security_hardening.sql.
export const GRACE_DAYS = 7;

export async function getPlanUsage(db: Awaited<ReturnType<typeof bizDb>>["db"], businessId: string) {
  const [{ count }, { data: sub }] = await Promise.all([
    db.from("products").select("id", { count: "exact", head: true }).eq("business_id", businessId),
    db.from("subscriptions").select("status, ends_at, plans(name, product_limit)").eq("business_id", businessId)
      .order("ends_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const plan = Array.isArray(sub?.plans) ? sub?.plans[0] : sub?.plans;
  const live = !!sub && sub.status === "active" && new Date(sub.ends_at).getTime() > Date.now();
  const graceEndsAt = sub ? new Date(new Date(sub.ends_at).getTime() + GRACE_DAYS * 86400000).toISOString() : null;
  // No subscription ever = a new sign-up waiting for approval: up to PENDING_PRODUCT_LIMIT products (see 0014).
  const pending = !sub;
  return {
    count: count ?? 0, limit: pending ? PENDING_PRODUCT_LIMIT : plan?.product_limit ?? null, planName: plan?.name ?? null, live,
    endsAt: sub?.ends_at ?? null, graceEndsAt, subStatus: sub?.status ?? null, pending,
  };
}

// Keep in sync with enforce_product_limit() in 0014_open_signup.sql.
export const PENDING_PRODUCT_LIMIT = 10;

export type ShopVisibility = "public" | "suspended" | "pending" | "expired" | "no-plan";

// Mirrors business_is_public() in the database (0007): active shop + an active plan that hasn't
// ended more than GRACE_DAYS ago. Used to explain to the owner why customers can't see the shop.
export function shopVisibility(businessStatus: string, usage: Awaited<ReturnType<typeof getPlanUsage>>): ShopVisibility {
  if (businessStatus !== "active") return "suspended";
  if (usage.pending) return "pending";
  if (!usage.endsAt || !usage.graceEndsAt || usage.subStatus !== "active") return "no-plan";
  if (new Date(usage.graceEndsAt).getTime() <= Date.now()) return "expired";
  return "public";
}

// order_clicks is service-role only (see 0002_rls_and_grants.sql). This is the single narrow
// place that reads it for a dashboard, always scoped to the business the caller was verified to own.
export async function getOrderClicks30(businessId: string): Promise<number> {
  const db = createAdminClient();
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const { count } = await db.from("order_clicks").select("id", { count: "exact", head: true }).eq("business_id", businessId).gte("created_at", since);
  return count ?? 0;
}
