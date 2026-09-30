import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({ businessId: z.string().uuid(), productId: z.string().uuid().optional() });

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  const db = createAdminClient();
  await db.from("order_clicks").insert({ business_id: parsed.data.businessId, product_id: parsed.data.productId ?? null });
  return NextResponse.json({ ok: true });
}
