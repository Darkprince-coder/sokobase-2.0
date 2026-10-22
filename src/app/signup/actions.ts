"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { checkShopExtras, createShopAccount, shopFormSchema } from "@/lib/onboarding";
import { verifyTurnstile } from "@/lib/turnstile";
import { visitorFingerprint } from "@/lib/fingerprint";
import { adminNotifyEmail, emailHtml, sendEmail } from "@/lib/email";
import { site } from "@/lib/site";
import type { ActionState } from "@/lib/action-state";

// Open sign-up from the Sell page. The shop is created without a subscription, so it stays hidden
// from customers until an admin approves it (Admin > New sign-ups). Up to 10 products meanwhile.
const PER_DEVICE_PER_HOUR = 5;
const ALL_PER_DAY = 100;

export type SignupState = ActionState & { attempt?: number };

export async function signUpBusiness(prev: SignupState, fd: FormData): Promise<SignupState> {
  const attempt = (prev.attempt ?? 0) + 1;
  const fail = (error: string): SignupState => ({ error, attempt });

  // Bots fill every field; people never see this one.
  if (String(fd.get("company_website") ?? "").trim()) return fail("Something went wrong. Please try again.");
  if (!(await verifyTurnstile(fd.get("cf-turnstile-response")))) return fail("Please complete the security check and try again.");

  const parsed = shopFormSchema.safeParse(Object.fromEntries(fd.entries()));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the form and try again.");
  const v = parsed.data;
  if (v.owner_name.length < 2) return fail("Enter your name.");
  const extras = checkShopExtras(v);
  if ("error" in extras) return fail(extras.error);

  const db = createAdminClient();

  // A plan is required (chosen on the Sell page or step 1 of /signup).
  const planSlug = String(fd.get("plan") ?? "").trim();
  const { data: plan } = planSlug ? await db.from("plans").select("id, name").eq("slug", planSlug).eq("active", true).maybeSingle() : { data: null };
  if (!plan) return fail("Choose a plan first. Go back and pick the plan that fits your shop.");

  // Rate limits: per device (anonymous daily fingerprint) and overall.
  const fingerprint = visitorFingerprint(await headers());
  const hourAgo = new Date(Date.now() - 3600000).toISOString();
  const dayAgo = new Date(Date.now() - 86400000).toISOString();
  const [{ count: mine }, { count: all }] = await Promise.all([
    db.from("signup_attempts").select("id", { count: "exact", head: true }).eq("fingerprint", fingerprint).gt("created_at", hourAgo),
    db.from("signup_attempts").select("id", { count: "exact", head: true }).gt("created_at", dayAgo),
  ]);
  if ((mine ?? 0) >= PER_DEVICE_PER_HOUR) return fail("Too many sign-ups from this device. Please try again in an hour, or message SokoBase on WhatsApp.");
  if ((all ?? 0) >= ALL_PER_DAY) return fail("Sign-ups are very busy right now. Please message SokoBase on WhatsApp and we will set you up.");
  await db.from("signup_attempts").insert({ fingerprint });
  // Housekeeping: attempts only matter for a day.
  await db.from("signup_attempts").delete().lt("created_at", new Date(Date.now() - 2 * 86400000).toISOString());


  const created = await createShopAccount(db, v, { ...extras, requestedPlanId: plan.id });
  if (!created.ok) return fail(created.error);

  // Tell the SokoBase team (best effort).
  const to = adminNotifyEmail();
  if (to) {
    await sendEmail(to, `New shop sign-up: ${v.name}`, emailHtml({
      heading: `${v.name} signed up`,
      paragraphs: [
        `${v.owner_name} (${v.email}, WhatsApp ${extras.whatsapp}) created a shop in ${v.location}.`,
        `They chose the ${plan.name} plan.`,
        "The shop is hidden until you approve it. They can add up to 10 products meanwhile.",
      ],
      button: { label: "Review sign-ups", href: `${site.portalUrl}/admin/signups` },
    }));
  }
  revalidatePath("/admin", "layout");

  const authed = await createClient();
  const { error: signInError } = await authed.auth.signInWithPassword({ email: v.email, password: v.password });
  if (signInError) redirect("/login");
  redirect("/dashboard?welcome=1");
}
