import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicClient } from "@/lib/supabase/public";
import { visitorFingerprint } from "@/lib/fingerprint";
import { sameSite } from "@/lib/same-site";
import { classifySource } from "@/lib/insights-source";

// Counts a view of a public product or shop page for the seller's Insights. Same defences as
// /api/order-click: same-site only, ids must be public, crawlers ignored, and the database keeps
// one row per visitor, page and day (unique index), using the rotating anonymous fingerprint.
const schema = z.object({
  businessId: z.string().uuid(),
  productId: z.string().uuid().optional(),
  referrer: z.string().max(500).optional(),
  internal: z.boolean().optional(),
  src: z.string().max(30).optional(),
});
const BOTS = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp\/|headless|lighthouse/i;
const ok = () => new NextResponse(null, { status: 204 });

export async function POST(req: Request) {
  if (!sameSite(req) || BOTS.test(req.headers.get("user-agent") ?? "")) return ok();
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  const v = parsed.data;

  const pub = createPublicClient();
  let businessId = v.businessId;
  const productId = v.productId ?? null;
  if (productId) {
    const { data: product } = await pub.from("products").select("business_id").eq("id", productId).maybeSingle();
    if (!product) return ok();
    businessId = product.business_id as string;
  } else {
    const { data: shop } = await pub.from("businesses").select("id").eq("id", businessId).maybeSingle();
    if (!shop) return ok();
  }

  const source = classifySource({ referrer: v.referrer, internal: v.internal, src: v.src });
  // A repeat view the same day hits the unique index (error 23505) and is simply not counted again.
  await createAdminClient().from("page_views").insert({ business_id: businessId, product_id: productId, fingerprint: visitorFingerprint(req.headers), source });
  return ok();
}
