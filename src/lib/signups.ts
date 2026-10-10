import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";

type Db = ReturnType<typeof createAdminClient>;

// A sign-up is pending while its shop has never had a subscription (see 0014_open_signup.sql).
// Unapproved sign-ups with no products are removed after this many days (api/cron/cleanup-signups).
export const ABANDONED_AFTER_DAYS = 30;

type Row = { id: string; subscriptions: { count: number }[] | null };
const isPending = (r: Row) => (r.subscriptions?.[0]?.count ?? 0) === 0;

export async function pendingSignupIds(db: Db): Promise<string[]> {
  const { data } = await db.from("businesses").select("id, subscriptions(count)").limit(5000);
  return ((data ?? []) as unknown as Row[]).filter(isPending).map((r) => r.id);
}

export type PendingSignup = {
  id: string; name: string; slug: string; ownerId: string; ownerName: string; email: string; whatsapp: string;
  location: string; county: string; categories: string[]; createdAt: string; logoUrl: string | null;
  requestedPlanId: string | null; productCount: number; photos: string[];
};

export async function getPendingSignups(db: Db): Promise<PendingSignup[]> {
  const ids = await pendingSignupIds(db);
  if (!ids.length) return [];
  const { data } = await db.from("businesses")
    .select("id, name, slug, owner_id, whatsapp, location, logo_url, created_at, requested_plan_id, counties(name), business_categories(categories(name)), products(images)")
    .in("id", ids).order("created_at", { ascending: false });
  type B = {
    id: string; name: string; slug: string; owner_id: string; whatsapp: string; location: string; logo_url: string | null; created_at: string;
    requested_plan_id: string | null; counties: { name: string } | { name: string }[] | null;
    business_categories: { categories: { name: string } | { name: string }[] | null }[] | null; products: { images: string[] | null }[] | null;
  };
  const rows = (data ?? []) as unknown as B[];
  const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);

  // Owner name and email live in profiles and auth.
  const ownerIds = rows.map((r) => r.owner_id);
  const { data: profiles } = await db.from("profiles").select("id, full_name").in("id", ownerIds);
  const emails = new Map<string, string>();
  await Promise.all(ownerIds.map(async (id) => {
    const { data: u } = await db.auth.admin.getUserById(id);
    if (u.user?.email) emails.set(id, u.user.email);
  }));

  return rows.map((r) => ({
    id: r.id, name: r.name, slug: r.slug, ownerId: r.owner_id,
    ownerName: profiles?.find((p) => p.id === r.owner_id)?.full_name ?? "",
    email: emails.get(r.owner_id) ?? "", whatsapp: r.whatsapp, location: r.location, county: one(r.counties)?.name ?? "",
    categories: (r.business_categories ?? []).map((c) => one(c.categories)?.name).filter((n): n is string => !!n),
    createdAt: r.created_at, logoUrl: r.logo_url, requestedPlanId: r.requested_plan_id,
    productCount: r.products?.length ?? 0,
    photos: (r.products ?? []).map((p) => p.images?.[0]).filter((u): u is string => !!u).slice(0, 6),
  }));
}
