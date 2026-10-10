import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { purgeBusiness } from "@/lib/business-removal";
import { ABANDONED_AFTER_DAYS, pendingSignupIds } from "@/lib/signups";

// Daily (vercel.json, 03:00 UTC): removes sign-ups that were never approved and never added a
// product within ABANDONED_AFTER_DAYS. Shops with products are left for the admin to decide.
// Vercel sends "Authorization: Bearer <CRON_SECRET>"; without the secret configured, nothing runs.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = createAdminClient();
  const ids = await pendingSignupIds(db);
  if (!ids.length) return NextResponse.json({ removed: 0 });

  const cutoff = new Date(Date.now() - ABANDONED_AFTER_DAYS * 86400000).toISOString();
  const { data: old } = await db.from("businesses").select("id, name, slug, owner_id, logo_url, cover_url, products(count)")
    .in("id", ids).lt("created_at", cutoff);
  const empty = ((old ?? []) as unknown as { id: string; name: string; slug: string; owner_id: string; logo_url: string | null; cover_url: string | null; products: { count: number }[] }[])
    .filter((b) => (b.products?.[0]?.count ?? 0) === 0);

  let removed = 0;
  for (const b of empty) {
    const r = await purgeBusiness(db, b);
    if (!r.ok) continue;
    removed++;
    await db.from("admin_audit_log").insert({ actor_id: null, action: "business.auto_remove", target_type: "business", target_id: b.id, details: { name: b.name, slug: b.slug, reason: `No products after ${ABANDONED_AFTER_DAYS} days` } });
  }
  return NextResponse.json({ removed });
}
