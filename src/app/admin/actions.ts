"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { adminDb, done, fail, refreshPublic, slugify, type ActionState } from "@/lib/admin";
import { generateInviteCode } from "@/lib/invites";
import { site } from "@/lib/site";

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
      revalidatePath("/admin/invites");
      return done("Invite created.", { code, link: `${site.portalUrl}/join?code=${code}`, expires });
    }
    if (error.code !== "23505") return fail("Could not create the invite.");
  }
  return fail("Could not create the invite. Try again.");
}

export async function revokeInvite(fd: FormData) {
  const { db } = await adminDb();
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success) return;
  await db.from("invites").delete().eq("id", id.data).is("used_at", null);
  revalidatePath("/admin/invites");
}

// ---------- Businesses and subscriptions ----------
export async function setBusinessStatus(fd: FormData) {
  const { db } = await adminDb();
  const id = uuid.safeParse(fd.get("id"));
  const status = z.enum(["active", "suspended"]).safeParse(fd.get("status"));
  if (!id.success || !status.success) return;
  await db.from("businesses").update({ status: status.data }).eq("id", id.data);
  revalidatePath("/admin/businesses");
  revalidatePath(`/admin/businesses/${id.data}`);
  refreshPublic();
}

const renewSchema = z.object({
  business_id: uuid,
  plan_id: uuid,
  duration_days: z.coerce.number().int().min(1, "Duration must be at least 1 day").max(365),
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

  const { error } = await db.from("subscriptions").insert({
    business_id: v.business_id, plan_id: v.plan_id, starts_at: new Date(base).toISOString(),
    ends_at: ends.toISOString(), payment_note: v.payment_note || null, created_by: user.id,
  });
  if (error) return fail("Could not save the subscription.");
  revalidatePath(`/admin/businesses/${v.business_id}`);
  revalidatePath("/admin/businesses");
  revalidatePath("/admin");
  return done(`Subscription active until ${ends.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}.`);
}

const passwordSchema = z.object({ business_id: uuid, password: z.string().min(10, "Use at least 10 characters").max(72) });

export async function resetOwnerPassword(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { db } = await adminDb();
  const parsed = passwordSchema.safeParse(fields(fd));
  if (!parsed.success) return fail(firstError(parsed.error));
  const { data: b } = await db.from("businesses").select("owner_id").eq("id", parsed.data.business_id).maybeSingle();
  if (!b) return fail("Business not found.");
  const { error } = await db.auth.admin.updateUserById(b.owner_id, { password: parsed.data.password });
  if (error) return fail("Could not update the password.");
  return done("Password updated. Share it with the owner privately.");
}

// ---------- Plans ----------
const planSchema = z.object({
  id: uuid, name: z.string().trim().min(2, "Plan name is too short").max(30),
  price_kes: z.coerce.number().int().min(0, "Price cannot be negative").max(1000000),
  duration_days: z.coerce.number().int().min(1).max(365),
});

export async function updatePlan(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { db } = await adminDb();
  const parsed = planSchema.safeParse(fields(fd));
  if (!parsed.success) return fail(firstError(parsed.error));
  const limitRaw = String(fd.get("product_limit") ?? "").trim();
  const limit = limitRaw === "" ? null : Number(limitRaw);
  if (limit !== null && (!Number.isInteger(limit) || limit < 1)) return fail("Product limit must be a whole number, or empty for unlimited.");

  const { id, ...rest } = parsed.data;
  const { error } = await db.from("plans").update({ ...rest, product_limit: limit, active: fd.get("active") === "on" }).eq("id", id);
  if (error) return fail("Could not save the plan.");
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
  const { db } = await adminDb();
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
  const { db } = await adminDb();
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
  revalidatePath(`/admin/categories/${v.category_id}/subcategories`);
  refreshPublic();
  return done(v.id ? "Subcategory saved." : "Subcategory added.");
}

export async function deleteSubcategory(fd: FormData) {
  const { db } = await adminDb();
  const id = uuid.safeParse(fd.get("id"));
  const categoryId = uuid.safeParse(fd.get("category_id"));
  if (!id.success || !categoryId.success) return;
  await db.from("subcategories").delete().eq("id", id.data).eq("category_id", categoryId.data);
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
  imageUrl: z.string().trim().max(500).default("")
    .refine((v) => v === "" || v.startsWith("https://res.cloudinary.com/"), "Upload the image so it is stored on Cloudinary"),
});

export async function saveHeroSlides(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { db } = await adminDb();
  let parsedJson: unknown;
  try { parsedJson = JSON.parse(String(fd.get("slides") ?? "[]")); } catch { return fail("Could not read the slides."); }
  const parsed = z.array(slideSchema).max(8, "Use at most 8 slides").safeParse(parsedJson);
  if (!parsed.success) return fail(firstError(parsed.error));
  const slides = parsed.data.map((s) => (s.ctaLabel && s.href ? s : { ...s, ctaLabel: "", href: "" }));

  const { error } = await db.from("platform_settings").upsert({ key: "hero_slides", value: slides }, { onConflict: "key" });
  if (error) return fail("Could not save the slides.");
  refreshPublic();
  return done(slides.length ? `${slides.length} slide${slides.length > 1 ? "s" : ""} saved.` : "Slides cleared. The default banner will show.");
}
