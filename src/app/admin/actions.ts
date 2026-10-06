"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { adminDb, audit, done, fail, refreshPublic, slugify, type ActionState } from "@/lib/admin";
import { generateInviteCode } from "@/lib/invites";
import { site } from "@/lib/site";
import { isOwnImageUrl } from "@/lib/cloudinary";

const uuid = z.string().uuid();
const firstError = (e: z.ZodError) => e.issues[0]?.message ?? "Check the form and try again.";
const fields = (fd: FormData) => Object.fromEntries(fd.entries());
const DAY = 86400000;

// ---------- Invites ----------
const inviteSchema = z.object({
  plan_id: uuid,
  duration_days: z.coerce.number().int().min(1, "Duration must be at least 1 day").max(365),
  expires_in_days: z.coerce.number().int().min(1).max(60),
  note: z.string().trim().max(120).optional(),
});

export async function createInvite(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { db, user } = await adminDb();
  const parsed = inviteSchema.safeParse(fields(fd));
  if (!parsed.success) return fail(firstError(parsed.error));
  const v = parsed.data;
  const expires = new Date(Date.now() + v.expires_in_days * DAY).toISOString();

  for (let i = 0; i < 5; i++) {
    const code = generateInviteCode();
    const { error } = await db.from("invites").insert({
      code, plan_id: v.plan_id, duration_days: v.duration_days, note: v.note || null, expires_at: expires, created_by: user.id,
    });
    if (!error) {
      await audit(db, user.id, "invite.create", { type: "invite" }, { code, plan_id: v.plan_id, duration_days: v.duration_days, note: v.note || null });
      revalidatePath("/admin/invites");
      return done("Invite created.", { code, link: `${site.portalUrl}/join?code=${code}`, expires });
    }
    if (error.code !== "23505") return fail("Could not create the invite.");
  }
  return fail("Could not create the invite. Try again.");
}

export async function revokeInvite(fd: FormData) {
  const { db, user } = await adminDb();
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success) return;
  const { data: removed } = await db.from("invites").delete().eq("id", id.data).is("used_at", null).select("code").maybeSingle();
  if (removed) await audit(db, user.id, "invite.revoke", { type: "invite", id: id.data }, { code: removed.code });
  revalidatePath("/admin/invites");
}

// ---------- Businesses and subscriptions ----------
export async function setBusinessStatus(fd: FormData) {
  const { db, user } = await adminDb();
  const id = uuid.safeParse(fd.get("id"));
  const status = z.enum(["active", "suspended"]).safeParse(fd.get("status"));
  if (!id.success || !status.success) return;
  const { error } = await db.from("businesses").update({ status: status.data }).eq("id", id.data);
  if (!error) await audit(db, user.id, status.data === "suspended" ? "business.suspend" : "business.activate", { type: "business", id: id.data });
  revalidatePath("/admin/businesses");
  revalidatePath(`/admin/businesses/${id.data}`);
  refreshPublic();
}

const renewSchema = z.object({
  business_id: uuid,
  plan_id: uuid,
  duration_days: z.coerce.number().int().min(1, "Duration must be at least 1 day").max(365),
  amount_kes: z.union([z.literal(""), z.coerce.number().int().min(0, "Amount cannot be negative").max(1000000)]).optional(),
  payment_note: z.string().trim().max(120).optional(),
});

export async function renewSubscription(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { db, user } = await adminDb();
  const parsed = renewSchema.safeParse(fields(fd));
  if (!parsed.success) return fail(firstError(parsed.error));
  const v = parsed.data;

  const { data: latest } = await db.from("subscriptions").select("ends_at")
    .eq("business_id", v.business_id).eq("status", "active").order("ends_at", { ascending: false }).limit(1).maybeSingle();
  const now = Date.now();
  const base = latest && new Date(latest.ends_at).getTime() > now ? new Date(latest.ends_at).getTime() : now;
  const ends = new Date(base + v.duration_days * DAY);

  // Amount defaults to the plan price when left empty (e.g. no discount given).
  let amount = typeof v.amount_kes === "number" ? v.amount_kes : null;
  if (amount === null) {
    const { data: plan } = await db.from("plans").select("price_kes").eq("id", v.plan_id).maybeSingle();
    amount = plan?.price_kes ?? null;
  }
  const { error } = await db.from("subscriptions").insert({
    business_id: v.business_id, plan_id: v.plan_id, starts_at: new Date(base).toISOString(),
    ends_at: ends.toISOString(), payment_note: v.payment_note || null, created_by: user.id, amount_kes: amount,
  });
  if (error) return fail("Could not save the subscription.");
  await audit(db, user.id, "subscription.renew", { type: "business", id: v.business_id },
    { plan_id: v.plan_id, duration_days: v.duration_days, amount_kes: amount, starts_at: new Date(base).toISOString(), ends_at: ends.toISOString(), payment_note: v.payment_note || null });
  refreshPublic(); // a lapsed shop becomes public again
  revalidatePath(`/admin/businesses/${v.business_id}`);
  revalidatePath("/admin/businesses");
  revalidatePath("/admin");
  return done(`Subscription active until ${ends.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}.`);
}

const passwordSchema = z.object({ business_id: uuid, password: z.string().min(10, "Use at least 10 characters").max(72) });

export async function resetOwnerPassword(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { db, user } = await adminDb();
  const parsed = passwordSchema.safeParse(fields(fd));
  if (!parsed.success) return fail(firstError(parsed.error));
  const { data: b } = await db.from("businesses").select("owner_id").eq("id", parsed.data.business_id).maybeSingle();
  if (!b) return fail("Business not found.");
  const { error } = await db.auth.admin.updateUserById(b.owner_id, { password: parsed.data.password });
  if (error) return fail("Could not update the password.");
  await audit(db, user.id, "owner.password_reset", { type: "business", id: parsed.data.business_id });
  return done("Password updated. Share it with the owner privately.");
}

// ---------- Plans ----------
const planSchema = z.object({
  id: uuid, name: z.string().trim().min(2, "Plan name is too short").max(30),
  price_kes: z.coerce.number().int().min(0, "Price cannot be negative").max(1000000),
  duration_days: z.coerce.number().int().min(1).max(365),
});

export async function updatePlan(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { db, user } = await adminDb();
  const parsed = planSchema.safeParse(fields(fd));
  if (!parsed.success) return fail(firstError(parsed.error));
  const limitRaw = String(fd.get("product_limit") ?? "").trim();
  const limit = limitRaw === "" ? null : Number(limitRaw);
  if (limit !== null && (!Number.isInteger(limit) || limit < 1)) return fail("Product limit must be a whole number, or empty for unlimited.");

  const { id, ...rest } = parsed.data;
  const { error } = await db.from("plans").update({ ...rest, product_limit: limit, active: fd.get("active") === "on" }).eq("id", id);
  if (error) return fail("Could not save the plan.");
  await audit(db, user.id, "plan.update", { type: "plan", id }, { ...rest, product_limit: limit, active: fd.get("active") === "on" });
  revalidatePath("/admin/plans");
  refreshPublic();
  return done("Plan saved.");
}

// ---------- Categories ----------
const categorySchema = z.object({
  id: uuid.optional().or(z.literal("")),
  name: z.string().trim().min(2, "Name is too short").max(40),
  slug: z.string().trim().max(40).optional(),
  icon: z.string().trim().max(40).regex(/^[a-z0-9-]*$/, "Icon must be a lucide icon name like shopping-basket").optional(),
  sort_order: z.coerce.number().int().min(0).max(999),
});

export async function saveCategory(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { db, user } = await adminDb();
  const parsed = categorySchema.safeParse(fields(fd));
  if (!parsed.success) return fail(firstError(parsed.error));
  const v = parsed.data;
  const base = { name: v.name, icon: v.icon || null, sort_order: v.sort_order, active: fd.get("active") === "on" };

  if (v.id) {
    const { error } = await db.from("categories").update(base).eq("id", v.id);
    if (error) return fail("Could not save the category.");
  } else {
    const slug = slugify(v.slug || v.name);
    if (slug.length < 2) return fail("Enter a valid name.");
    const { error } = await db.from("categories").insert({ ...base, slug });
    if (error) return fail(error.code === "23505" ? "A category with that name already exists." : "Could not add the category.");
  }
  await audit(db, user.id, v.id ? "category.update" : "category.create", { type: "category", id: v.id || null }, base);
  revalidatePath("/admin/categories");
  refreshPublic();
  return done(v.id ? "Category saved." : "Category added.");
}

// ---------- Subcategories (curated, nested under a category) ----------
const subcategorySchema = z.object({
  id: uuid.optional().or(z.literal("")),
  category_id: uuid,
  name: z.string().trim().min(2, "Name is too short").max(40),
  sort_order: z.coerce.number().int().min(0).max(999),
});

export async function saveSubcategory(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { db, user } = await adminDb();
  const parsed = subcategorySchema.safeParse(fields(fd));
  if (!parsed.success) return fail(firstError(parsed.error));
  const v = parsed.data;
  const base = { name: v.name, sort_order: v.sort_order, active: fd.get("active") === "on" };

  if (v.id) {
    const { error } = await db.from("subcategories").update(base).eq("id", v.id).eq("category_id", v.category_id);
    if (error) return fail("Could not save the subcategory.");
  } else {
    const slug = slugify(v.name);
    if (slug.length < 2) return fail("Enter a valid name.");
    const { error } = await db.from("subcategories").insert({ ...base, category_id: v.category_id, slug });
    if (error) return fail(error.code === "23505" ? "A subcategory with that name already exists here." : "Could not add the subcategory.");
  }
  await audit(db, user.id, v.id ? "subcategory.update" : "subcategory.create", { type: "subcategory", id: v.id || null }, { ...base, category_id: v.category_id });
  revalidatePath(`/admin/categories/${v.category_id}/subcategories`);
  refreshPublic();
  return done(v.id ? "Subcategory saved." : "Subcategory added.");
}

export async function deleteSubcategory(fd: FormData) {
  const { db, user } = await adminDb();
  const id = uuid.safeParse(fd.get("id"));
  const categoryId = uuid.safeParse(fd.get("category_id"));
  if (!id.success || !categoryId.success) return;
  const { error } = await db.from("subcategories").delete().eq("id", id.data).eq("category_id", categoryId.data);
  if (!error) await audit(db, user.id, "subcategory.delete", { type: "subcategory", id: id.data }, { category_id: categoryId.data });
  else if (error.code === "23503") {
    // Still used by products: hide it from new listings instead, so existing products keep it.
    await db.from("subcategories").update({ active: false }).eq("id", id.data).eq("category_id", categoryId.data);
    await audit(db, user.id, "subcategory.update", { type: "subcategory", id: id.data }, { active: false, reason: "in use, hidden instead of deleted" });
  }
  revalidatePath(`/admin/categories/${categoryId.data}/subcategories`);
  refreshPublic();
}

// ---------- Hero slides ----------
const slideSchema = z.object({
  id: z.string().min(1).max(40),
  title: z.string().trim().min(2, "Every slide needs a title").max(90),
  subtitle: z.string().trim().max(160).default(""),
  ctaLabel: z.string().trim().max(30).default(""),
  href: z.string().trim().max(200).default("")
    .refine((v) => v === "" || (v.startsWith("/") && !v.startsWith("//")) || v.startsWith("https://"), "Links must start with / or https://"),
  imageOnly: z.boolean().default(false),
  imageUrl: z.string().trim().max(500).default("")
    .refine((v) => v === "" || isOwnImageUrl(v), "Upload the image so it is stored on Cloudinary"),
});

export async function saveHeroSlides(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { db, user } = await adminDb();
  let parsedJson: unknown;
  try { parsedJson = JSON.parse(String(fd.get("slides") ?? "[]")); } catch { return fail("Could not read the slides."); }
  const parsed = z.array(slideSchema).max(8, "Use at most 8 slides").safeParse(parsedJson);
  if (!parsed.success) return fail(firstError(parsed.error));
  if (parsed.data.some((s) => s.imageOnly && !s.imageUrl)) return fail("A slide set to 'image has its own text' needs an image.");
  const slides = parsed.data.map((s) => (s.imageOnly || (s.ctaLabel && s.href) ? s : { ...s, ctaLabel: "", href: "" }));

  const { error } = await db.from("platform_settings").upsert({ key: "hero_slides", value: slides }, { onConflict: "key" });
  if (error) return fail("Could not save the slides.");
  await audit(db, user.id, "hero.update", { type: "settings" }, { slides: slides.length });
  refreshPublic();
  return done(slides.length ? `${slides.length} slide${slides.length > 1 ? "s" : ""} saved.` : "Slides cleared. The default banner will show.");
}

// ---------- Subscription corrections ----------
const refreshBusiness = (businessId: string) => {
  revalidatePath(`/admin/businesses/${businessId}`);
  revalidatePath("/admin/businesses");
  revalidatePath("/admin");
  refreshPublic();
};

// Cancels a period recorded by mistake (or refunded). The shop's visibility follows automatically.
export async function cancelSubscription(fd: FormData) {
  const { db, user } = await adminDb();
  const id = uuid.safeParse(fd.get("id"));
  const businessId = uuid.safeParse(fd.get("business_id"));
  if (!id.success || !businessId.success) return;
  const { error } = await db.from("subscriptions").update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("id", id.data).eq("business_id", businessId.data).eq("status", "active");
  if (error) return;
  await audit(db, user.id, "subscription.cancel", { type: "business", id: businessId.data }, { subscription_id: id.data });
  refreshBusiness(businessId.data);
}

const endDateSchema = z.object({ id: uuid, business_id: uuid, ends_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date") });

// Corrects the end date of a period (typo in days, goodwill extension, early end).
export async function setSubscriptionEnd(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { db, user } = await adminDb();
  const parsed = endDateSchema.safeParse(fields(fd));
  if (!parsed.success) return fail(firstError(parsed.error));
  const v = parsed.data;
  // End of the chosen day in Kenya time (UTC+3).
  const ends = new Date(`${v.ends_on}T23:59:59+03:00`);
  const { data: sub } = await db.from("subscriptions").select("starts_at, ends_at").eq("id", v.id).eq("business_id", v.business_id).maybeSingle();
  if (!sub) return fail("Subscription not found.");
  if (ends.getTime() <= new Date(sub.starts_at).getTime()) return fail("The end date must be after the start date.");
  const { error } = await db.from("subscriptions").update({ ends_at: ends.toISOString() }).eq("id", v.id);
  if (error) return fail("Could not update the end date.");
  await audit(db, user.id, "subscription.set_end", { type: "business", id: v.business_id }, { subscription_id: v.id, from: sub.ends_at, to: ends.toISOString() });
  refreshBusiness(v.business_id);
  return done(`End date set to ${ends.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}.`);
}

// ---------- Verification and moderation ----------
export async function setVerified(fd: FormData) {
  const { db, user } = await adminDb();
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success) return;
  const verified = fd.get("verified") === "1";
  const { error } = await db.from("businesses").update({ verified_at: verified ? new Date().toISOString() : null }).eq("id", id.data);
  if (error) return;
  await audit(db, user.id, verified ? "business.verify" : "business.unverify", { type: "business", id: id.data });
  refreshBusiness(id.data);
}

// Hide (or restore) a single product without suspending the whole shop.
export async function moderateProduct(fd: FormData) {
  const { db, user } = await adminDb();
  const id = uuid.safeParse(fd.get("id"));
  const status = z.enum(["draft", "published"]).safeParse(fd.get("status"));
  if (!id.success || !status.success) return;
  const { data: product } = await db.from("products").update({ status: status.data }).eq("id", id.data).select("slug, business_id").maybeSingle();
  if (!product) return;
  await audit(db, user.id, status.data === "draft" ? "product.unpublish" : "product.republish", { type: "product", id: id.data }, { business_id: product.business_id });
  revalidatePath(`/products/${product.slug}`);
  revalidatePath("/admin/reports");
  refreshBusiness(product.business_id);
}

export async function resolveReport(fd: FormData) {
  const { db, user } = await adminDb();
  const id = uuid.safeParse(fd.get("id"));
  const status = z.enum(["resolved", "dismissed", "open"]).safeParse(fd.get("status"));
  if (!id.success || !status.success) return;
  const reopened = status.data === "open";
  const { error } = await db.from("reports").update({
    status: status.data, resolved_by: reopened ? null : user.id, resolved_at: reopened ? null : new Date().toISOString(),
  }).eq("id", id.data);
  if (error) return;
  await audit(db, user.id, `report.${status.data}`, { type: "report", id: id.data });
  revalidatePath("/admin/reports");
  revalidatePath("/admin");
}
