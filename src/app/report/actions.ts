"use server";
import { headers } from "next/headers";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicClient } from "@/lib/supabase/public";
import { visitorFingerprint } from "@/lib/fingerprint";

export type ReportState = { ok?: boolean; error?: string };

const schema = z.object({
  product_id: z.string().uuid().optional().or(z.literal("")),
  business_id: z.string().uuid(),
  reason: z.enum(["scam", "wrong_info", "prohibited", "unreachable", "other"], { message: "Choose a reason." }),
  details: z.string().trim().max(500, "Keep it under 500 characters.").optional().default(""),
  contact: z.string().trim().max(80).optional().default(""),
});
const DAILY_LIMIT = 5;

// Public: anyone can flag a listing. Reports go to the admin (Admin > Reports), never shown publicly.
export async function submitReport(_prev: ReportState, fd: FormData): Promise<ReportState> {
  const parsed = schema.safeParse(Object.fromEntries(fd.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  const v = parsed.data;
  if (v.reason === "other" && v.details.length < 5) return { error: "Tell us briefly what is wrong." };

  // The anon client confirms the shop (and product) are public and belong together.
  const pub = createPublicClient();
  if (v.product_id) {
    const { data } = await pub.from("products").select("business_id").eq("id", v.product_id).maybeSingle();
    if (!data || data.business_id !== v.business_id) return { error: "This listing is no longer available." };
  } else {
    const { data } = await pub.from("businesses").select("id").eq("id", v.business_id).maybeSingle();
    if (!data) return { error: "This shop is no longer available." };
  }

  const db = createAdminClient();
  const fingerprint = visitorFingerprint(await headers());
  const { count } = await db.from("reports").select("id", { count: "exact", head: true })
    .eq("fingerprint", fingerprint).gte("created_at", new Date(Date.now() - 86400000).toISOString());
  if ((count ?? 0) >= DAILY_LIMIT) return { ok: true }; // quietly accept: nothing to gain by spamming

  const { error } = await db.from("reports").insert({
    business_id: v.business_id, product_id: v.product_id || null, reason: v.reason,
    details: v.details || null, contact: v.contact || null, fingerprint,
  });
  if (error) return { error: "Could not send your report. Please try again." };
  return { ok: true };
}
