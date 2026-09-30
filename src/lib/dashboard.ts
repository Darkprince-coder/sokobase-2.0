import "server-only";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireBusiness } from "@/lib/auth";
import type { ActionState } from "@/lib/action-state";

export type { ActionState };
export const fail = (error: string): ActionState => ({ error });
export const done = (message: string, data?: Record<string, string>): ActionState => ({ ok: true, message, data });

// Every dashboard page and server action calls this first. Redirects super admins to /admin
// and sends an owner with no linked business back to the dashboard's own message.
export async function bizDb() {
  const { supabase, user, business } = await requireBusiness();
  if (!business) redirect("/dashboard");
  return { db: supabase, user, business };
}

export const refreshDashboard = () => revalidatePath("/dashboard", "layout");

// Friendly text for the two errors owners can actually hit: the DB's product-limit trigger,
// and RLS blocking writes because the subscription lapsed.
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
  return {
    count: count ?? 0,
    limit: plan?.product_limit ?? null,
    planName: plan?.name ?? null,
    live,
    endsAt: sub?.ends_at ?? null,
  };
}
