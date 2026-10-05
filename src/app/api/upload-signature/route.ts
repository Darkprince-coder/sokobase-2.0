import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Signs a Cloudinary upload for a verified caller, so only this app can upload (the unsigned preset
// can then be disabled). Who may sign, and where their files go:
//   super admin       -> sokobase/platform
//   business owner    -> sokobase/shops/<business id>
//   valid invite code -> sokobase/signup/<invite code>   (logo upload during registration)
const schema = z.object({ inviteCode: z.string().regex(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/).optional() });
const ALLOWED_FORMATS = "jpg,jpeg,png,webp";
const TRANSFORMATION = "c_limit,w_1600,h_1600"; // applied on upload: stored images are never huge

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

async function resolveFolder(inviteCode?: string): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profile?.role === "super_admin") return "sokobase/platform";
    const { data: businessId } = await supabase.rpc("my_business_id");
    if (businessId) return `sokobase/shops/${businessId}`;
  }
  if (inviteCode) {
    const { data: invite } = await createAdminClient().from("invites").select("id")
      .eq("code", inviteCode).is("used_at", null).gt("expires_at", new Date().toISOString()).maybeSingle();
    if (invite) return `sokobase/signup/${inviteCode}`;
  }
  return null;
}

export async function POST(req: Request) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  // Not configured yet: the client falls back to the unsigned preset (development only).
  if (!cloudName || !apiKey || !apiSecret) return json({ error: "signing-not-configured" }, 501);

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: "bad-request" }, 400);

  const folder = await resolveFolder(parsed.data.inviteCode);
  if (!folder) return json({ error: "unauthorized" }, 401);

  const timestamp = Math.floor(Date.now() / 1000);
  const params: Record<string, string | number> = { allowed_formats: ALLOWED_FORMATS, folder, timestamp, transformation: TRANSFORMATION };
  const toSign = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join("&");
  const signature = createHash("sha1").update(toSign + apiSecret).digest("hex");

  return json({ cloudName, apiKey, signature, ...params });
}
