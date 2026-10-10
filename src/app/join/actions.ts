"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { checkShopExtras, createShopAccount, shopFormSchema } from "@/lib/onboarding";
import type { ActionState } from "@/lib/action-state";

const inviteCode = z.string().regex(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/, "Invalid invite code.");

export async function registerBusiness(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const code = inviteCode.safeParse(fd.get("invite_code"));
  if (!code.success) return { error: code.error.issues[0]?.message ?? "Invalid invite code." };
  const parsed = shopFormSchema.safeParse(Object.fromEntries(fd.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  const v = parsed.data;
  const extras = checkShopExtras(v);
  if ("error" in extras) return { error: extras.error };

  const db = createAdminClient();

  const { data: invite, error: claimError } = await db
    .from("invites")
    .update({ used_at: new Date().toISOString() })
    .eq("code", code.data)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .select("id, plan_id, duration_days")
    .maybeSingle();
  if (claimError || !invite) return { error: "This invite link is no longer valid. Ask SokoBase for a new one." };

  const releaseInvite = () => db.from("invites").update({ used_at: null }).eq("id", invite.id);

  const created = await createShopAccount(db, v, extras);
  if (!created.ok) { await releaseInvite(); return { error: created.error }; }

  const startsAt = new Date();
  const endsAt = new Date(startsAt.getTime() + invite.duration_days * 86400000);
  const { error: subError } = await db.from("subscriptions").insert({
    business_id: created.businessId, plan_id: invite.plan_id, starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString(),
    payment_note: `Invite ${code.data}`,
  });
  if (subError) {
    await created.rollback(); await releaseInvite();
    return { error: "Could not activate your subscription. Try again." };
  }

  await db.from("invites").update({ business_id: created.businessId }).eq("id", invite.id);
  // Amount paid for the first period = the plan price (fails harmlessly before migration 0009).
  const { data: plan } = await db.from("plans").select("price_kes").eq("id", invite.plan_id).maybeSingle();
  if (plan) await db.from("subscriptions").update({ amount_kes: plan.price_kes }).eq("business_id", created.businessId);

  const authed = await createClient();
  const { error: signInError } = await authed.auth.signInWithPassword({ email: v.email, password: v.password });
  if (signInError) redirect("/login");

  redirect("/dashboard");
}
