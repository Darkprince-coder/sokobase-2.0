"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slug";
import { normalizeKePhone } from "@/lib/phone";
import { isOwnImageUrl } from "@/lib/cloudinary";
import type { ActionState } from "@/lib/action-state";

const schema = z
  .object({
    invite_code: z.string().regex(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/, "Invalid invite code."),
    name: z.string().trim().min(2, "Business name is too short").max(80),
    category_ids: z.string().optional().default("[]"),
    county_id: z.string().uuid("Choose your county"),
    location: z.string().trim().min(2, "Enter a location").max(80),
    whatsapp: z.string().trim().min(9, "Enter a valid phone number"),
    email: z.string().trim().toLowerCase().email("Enter a valid email"),
    password: z.string().min(10, "Use at least 10 characters").max(72),
    confirm_password: z.string(),
    logo_url: z.string().trim().max(500).optional().default(""),
  })
  .refine((v) => v.password === v.confirm_password, { message: "Passwords do not match.", path: ["confirm_password"] })
  .refine((v) => v.logo_url === "" || isOwnImageUrl(v.logo_url), { message: "Upload the logo properly.", path: ["logo_url"] });

export async function registerBusiness(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = schema.safeParse(Object.fromEntries(fd.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  const v = parsed.data;

  let categoryIds: string[] = [];
  try {
    const raw = JSON.parse(v.category_ids);
    const check = z.array(z.string().uuid()).min(1, "Choose at least one category").max(3, "Choose up to 3 categories").safeParse(raw);
    if (!check.success) return { error: check.error.issues[0]?.message ?? "Choose 1 to 3 categories." };
    categoryIds = check.data;
  } catch {
    return { error: "Choose at least one category." };
  }

  const whatsapp = normalizeKePhone(v.whatsapp);
  if (!whatsapp) return { error: "Enter a valid Kenyan WhatsApp number, e.g. 07XXXXXXXX." };

  const db = createAdminClient();

  const { data: invite, error: claimError } = await db
    .from("invites")
    .update({ used_at: new Date().toISOString() })
    .eq("code", v.invite_code)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .select("id, plan_id, duration_days")
    .maybeSingle();
  if (claimError || !invite) return { error: "This invite link is no longer valid. Ask SokoBase for a new one." };

  const releaseInvite = () => db.from("invites").update({ used_at: null }).eq("id", invite.id);

  const base = slugify(v.name) || "shop";
  let slug = base;
  for (let i = 0; i < 6; i++) {
    const { data: taken } = await db.from("businesses").select("id").eq("slug", slug).maybeSingle();
    if (!taken) break;
    slug = `${base}-${Math.random().toString(36).slice(2, 5)}`;
    if (i === 5) { await releaseInvite(); return { error: "Could not create a shop link. Try a different business name." }; }
  }

  const { data: created, error: userError } = await db.auth.admin.createUser({ email: v.email, password: v.password, email_confirm: true });
  if (userError || !created.user) {
    await releaseInvite();
    return { error: userError?.message.includes("already") ? "An account with that email already exists." : "Could not create the account." };
  }
  const userId = created.user.id;

  const { error: profileError } = await db.from("profiles").insert({ id: userId, role: "business_owner", full_name: v.name });
  if (profileError) {
    await db.auth.admin.deleteUser(userId); await releaseInvite();
    return { error: "Could not create the account. Try again." };
  }

  const { data: business, error: bizError } = await db
    .from("businesses")
    .insert({ owner_id: userId, slug, name: v.name, county_id: v.county_id, location: v.location, whatsapp, logo_url: v.logo_url || null, status: "active" })
    .select("id").single();
  if (bizError || !business) {
    await db.auth.admin.deleteUser(userId); await releaseInvite();
    return { error: "Could not create your shop. Try again." };
  }

  const { error: catError } = await db.from("business_categories").insert(categoryIds.map((category_id) => ({ business_id: business.id, category_id })));
  if (catError) {
    await db.from("businesses").delete().eq("id", business.id); await db.auth.admin.deleteUser(userId); await releaseInvite();
    return { error: "Could not save your categories. Try again." };
  }

  const startsAt = new Date();
  const endsAt = new Date(startsAt.getTime() + invite.duration_days * 86400000);
  const { error: subError } = await db.from("subscriptions").insert({
    business_id: business.id, plan_id: invite.plan_id, starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString(),
    payment_note: `Invite ${v.invite_code}`,
  });
  if (subError) {
    await db.from("businesses").delete().eq("id", business.id); await db.auth.admin.deleteUser(userId); await releaseInvite();
    return { error: "Could not activate your subscription. Try again." };
  }

  await db.from("invites").update({ business_id: business.id }).eq("id", invite.id);
  // Amount paid for the first period = the plan price (fails harmlessly before migration 0009).
  const { data: plan } = await db.from("plans").select("price_kes").eq("id", invite.plan_id).maybeSingle();
  if (plan) await db.from("subscriptions").update({ amount_kes: plan.price_kes }).eq("business_id", business.id);

  const authed = await createClient();
  const { error: signInError } = await authed.auth.signInWithPassword({ email: v.email, password: v.password });
  if (signInError) redirect("/login");

  redirect("/dashboard");
}
