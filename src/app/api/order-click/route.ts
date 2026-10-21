import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicClient } from "@/lib/supabase/public";
import { visitorFingerprint } from "@/lib/fingerprint";
import { sameSite } from "@/lib/same-site";

// Logs taps on "Order on WhatsApp". Public by design (it fires from public pages), so it defends
// itself: same-site requests only, ids must refer to a public shop/product, repeat taps by the same
// visitor within 30 minutes count once, and bursts are dropped. The visitor fingerprint is a salted
// hash that rotates daily, so no IP address or user agent is ever stored.
const schema = z.object({ businessId: z.string().uuid(), productId: z.string().uuid().optional() });
const DEDUPE_MINUTES = 30;
const BURST_WINDOW_MINUTES = 10;
const BURST_LIMIT = 20;

const ok = () => new NextResponse(null, { status: 204 });

export async function POST(req: Request) {
  if (!sameSite(req)) return ok(); // silently ignored: nothing to learn by probing
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  // Resolve the business from the product itself (anon client, so RLS confirms both are public).
  const pub = createPublicClient();
  let businessId = parsed.data.businessId;
  const productId = parsed.data.productId ?? null;
  if (productId) {
    const { data: product } = await pub.from("products").select("business_id").eq("id", productId).maybeSingle();
    if (!product) return ok();
    businessId = product.business_id as string;
  } else {
    const { data: shop } = await pub.from("businesses").select("id").eq("id", businessId).maybeSingle();
    if (!shop) return ok();
  }

  const db = createAdminClient();
  const fp = visitorFingerprint(req.headers);
  const now = Date.now();

  let recent = db.from("order_clicks").select("id", { count: "exact", head: true })
    .eq("fingerprint", fp).eq("business_id", businessId)
    .gte("created_at", new Date(now - DEDUPE_MINUTES * 60000).toISOString());
  recent = productId ? recent.eq("product_id", productId) : recent.is("product_id", null);
  const burst = db.from("order_clicks").select("id", { count: "exact", head: true })
    .eq("fingerprint", fp).gte("created_at", new Date(now - BURST_WINDOW_MINUTES * 60000).toISOString());

  const [{ count: dupes }, { count: burstCount }] = await Promise.all([recent, burst]);
  if ((dupes ?? 0) > 0 || (burstCount ?? 0) >= BURST_LIMIT) return ok();

  await db.from("order_clicks").insert({ business_id: businessId, product_id: productId, fingerprint: fp });
  return ok();
}
