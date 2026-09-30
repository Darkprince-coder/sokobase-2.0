"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { bizDb, done, fail, readableDbError, type ActionState } from "@/lib/dashboard";
import { createClient } from "@/lib/supabase/server";
import { normalizeKePhone } from "@/lib/phone";
import { slugify } from "@/lib/slug";

const fields = (fd: FormData) => Object.fromEntries(fd.entries());
const firstError = (e: z.ZodError) => e.issues[0]?.message ?? "Check the form and try again.";

// ---------- Profile ----------
const profileSchema = z.object({
  name: z.string().trim().min(2, "Business name is too short").max(80),
  description: z.string().trim().max(1000).optional().default(""),
  category_id: z.string().uuid("Choose a category"),
  location: z.string().trim().min(2, "Enter a location").max(80),
  whatsapp: z.string().trim().min(9, "Enter a valid phone number"),
  logo_url: z.string().trim().max(500).optional().default(""),
  cover_url: z.string().trim().max(500).optional().default(""),
});

export async function updateProfile(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { db, business } = await bizDb();
  const parsed = profileSchema.safeParse(fields(fd));
  if (!parsed.success) return fail(firstError(parsed.error));
  const v = parsed.data;
  const whatsapp = normalizeKePhone(v.whatsapp);
  if (!whatsapp) return fail("Enter a valid Kenyan WhatsApp number, e.g. 07XXXXXXXX.");

  const { error } = await db.from("businesses").update({
    name: v.name, description: v.description || null, category_id: v.category_id, location: v.location,
    whatsapp, logo_url: v.logo_url || null, cover_url: v.cover_url || null,
  }).eq("id", business.id);
  if (error) return fail(readableDbError(error.message, error.code));

  revalidatePath("/dashboard");
  return done("Shop profile saved.");
}

// ---------- Products ----------
const productSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  name: z.string().trim().min(2, "Product name is too short").max(120),
  description: z.string().trim().max(4000).optional().default(""),
  category_id: z.string().uuid().optional().or(z.literal("")),
  price_type: z.enum(["fixed", "from", "contact"]),
  price: z.string().optional().default(""),
  old_price: z.string().optional().default(""),
  badge: z.enum(["hot", "offer", "new", ""]).optional().default(""),
  images: z.string().optional().default("[]"),
});

export async function saveProduct(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { db, business } = await bizDb();
  const parsed = productSchema.safeParse(fields(fd));
  if (!parsed.success) return fail(firstError(parsed.error));
  const v = parsed.data;

  let images: string[] = [];
  try { images = JSON.parse(v.images).filter((u: unknown) => typeof u === "string" && u.startsWith("https://res.cloudinary.com/")).slice(0, 8); } catch {}

  let price: number | null = null;
  let oldPrice: number | null = null;
  if (v.price_type !== "contact") {
    const n = Number(v.price);
    if (!v.price || Number.isNaN(n) || n < 0) return fail("Enter a valid price.");
    price = Math.round(n * 100) / 100;
  }
  if (v.old_price.trim()) {
    const n = Number(v.old_price);
    if (Number.isNaN(n) || n <= 0) return fail("Enter a valid old price.");
    oldPrice = Math.round(n * 100) / 100;
    if (price !== null && oldPrice <= price) return fail("Old price must be higher than the current price.");
  }

  const inStock = fd.get("in_stock") === "on";
  const status = fd.get("status") === "draft" ? "draft" : "published";
  const base = {
    business_id: business.id, category_id: v.category_id || null, name: v.name, description: v.description || null,
    price, old_price: oldPrice, price_type: v.price_type, badge: v.badge || null, images, in_stock: inStock, status,
  };

  if (v.id) {
    const { error } = await db.from("products").update(base).eq("id", v.id).eq("business_id", business.id);
    if (error) return fail(readableDbError(error.message, error.code));
    revalidatePath("/dashboard/products");
    return done("Product saved.");
  }

  const productSlugBase = slugify(v.name) || "product";
  let slug = productSlugBase;
  for (let i = 0; i < 5; i++) {
    const { data: taken } = await db.from("products").select("id").eq("business_id", business.id).eq("slug", slug).maybeSingle();
    if (!taken) break;
    slug = `${productSlugBase}-${i + 2}`;
  }

  const { error } = await db.from("products").insert({ ...base, slug });
  if (error) return fail(readableDbError(error.message, error.code));
  revalidatePath("/dashboard/products");
  redirect("/dashboard/products");
}

export async function deleteProduct(fd: FormData) {
  const { db, business } = await bizDb();
  const id = z.string().uuid().safeParse(fd.get("id"));
  if (!id.success) return;
  await db.from("products").delete().eq("id", id.data).eq("business_id", business.id);
  revalidatePath("/dashboard/products");
}

export async function toggleProductStock(fd: FormData) {
  const { db, business } = await bizDb();
  const id = z.string().uuid().safeParse(fd.get("id"));
  const inStock = fd.get("in_stock") === "true";
  if (!id.success) return;
  await db.from("products").update({ in_stock: !inStock }).eq("id", id.data).eq("business_id", business.id);
  revalidatePath("/dashboard/products");
}

export async function toggleProductStatus(fd: FormData) {
  const { db, business } = await bizDb();
  const id = z.string().uuid().safeParse(fd.get("id"));
  const status = fd.get("status");
  if (!id.success) return;
  await db.from("products").update({ status: status === "published" ? "draft" : "published" }).eq("id", id.data).eq("business_id", business.id);
  revalidatePath("/dashboard/products");
}

// ---------- Security ----------
const passwordSchema = z
  .object({
    current_password: z.string().min(1, "Enter your current password"),
    new_password: z.string().min(10, "Use at least 10 characters").max(72),
    confirm_password: z.string(),
  })
  .refine((v) => v.new_password === v.confirm_password, { message: "New passwords do not match.", path: ["confirm_password"] })
  .refine((v) => v.current_password !== v.new_password, { message: "New password must be different from the current one.", path: ["new_password"] });

export async function changePassword(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { user } = await bizDb();
  const parsed = passwordSchema.safeParse(fields(fd));
  if (!parsed.success) return fail(firstError(parsed.error));
  if (!user.email) return fail("Your account has no email on file.");

  const db = await createClient();
  // Re-verify identity before allowing the change; wrong password leaves the session untouched.
  const { error: verifyError } = await db.auth.signInWithPassword({ email: user.email, password: parsed.data.current_password });
  if (verifyError) return fail("Current password is incorrect.");

  const { error } = await db.auth.updateUser({ password: parsed.data.new_password });
  if (error) return fail("Could not update the password. Try again.");
  return done("Password updated.");
}
