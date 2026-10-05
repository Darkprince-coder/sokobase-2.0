"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { bizDb, done, fail, readableDbError, refreshShop, type ActionState } from "@/lib/dashboard";
import { createClient } from "@/lib/supabase/server";
import { normalizeKePhone } from "@/lib/phone";
import { slugify } from "@/lib/slug";
import { isOwnImageUrl } from "@/lib/cloudinary";

const fields = (fd: FormData) => Object.fromEntries(fd.entries());
const firstError = (e: z.ZodError) => e.issues[0]?.message ?? "Check the form and try again.";

// ---------- Profile ----------
const profileSchema = z.object({
  name: z.string().trim().min(2, "Business name is too short").max(80),
  description: z.string().trim().max(1000).optional().default(""),
  county_id: z.string().uuid("Choose your county"),
  location: z.string().trim().min(2, "Enter a location").max(80),
  whatsapp: z.string().trim().min(9, "Enter a valid phone number"),
  logo_url: z.string().trim().max(500).optional().default(""),
  cover_url: z.string().trim().max(500).optional().default(""),
  category_ids: z.string().optional().default("[]"),
});

export async function updateProfile(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { db, business } = await bizDb();
  const parsed = profileSchema.safeParse(fields(fd));
  if (!parsed.success) return fail(firstError(parsed.error));
  const v = parsed.data;
  const whatsapp = normalizeKePhone(v.whatsapp);
  if (!whatsapp) return fail("Enter a valid Kenyan WhatsApp number, e.g. 07XXXXXXXX.");
  if ((v.logo_url && !isOwnImageUrl(v.logo_url)) || (v.cover_url && !isOwnImageUrl(v.cover_url))) return fail("Upload images using the upload buttons.");

  let categoryIds: string[] = [];
  try {
    const check = z.array(z.string().uuid()).min(1, "Choose at least one category").max(3, "Choose up to 3 categories").safeParse(JSON.parse(v.category_ids));
    if (!check.success) return fail(check.error.issues[0]?.message ?? "Choose 1 to 3 categories.");
    categoryIds = check.data;
  } catch {
    return fail("Choose at least one category.");
  }

  const { error } = await db.from("businesses").update({
    name: v.name, description: v.description || null, county_id: v.county_id, location: v.location,
    whatsapp, logo_url: v.logo_url || null, cover_url: v.cover_url || null,
  }).eq("id", business.id);
  if (error) return fail(readableDbError(error.message, error.code));

  // Replaces the whole set in one transaction, so a failure can't leave the shop with no categories.
  const { error: catError } = await db.rpc("set_business_categories", { p_business_id: business.id, p_category_ids: categoryIds });
  if (catError) return fail(readableDbError(catError.message, catError.code));

  revalidatePath("/dashboard");
  refreshShop(business.slug);
  return done("Shop profile saved.");
}

// ---------- Products ----------
const variantRowSchema = z.object({
  id: z.string().optional(), label: z.string().trim().min(1).max(40),
  price: z.string().optional().default(""), oldPrice: z.string().optional().default(""), inStock: z.boolean().optional().default(true),
});

const productSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  name: z.string().trim().min(2, "Product name is too short").max(120),
  description: z.string().trim().max(4000).optional().default(""),
  category_id: z.string().uuid().optional().or(z.literal("")),
  subcategory_id: z.string().uuid().optional().or(z.literal("")),
  price_type: z.enum(["fixed", "from", "contact"]),
  price: z.string().optional().default(""),
  old_price: z.string().optional().default(""),
  badge: z.enum(["hot", "offer", "new", ""]).optional().default(""),
  images: z.string().optional().default("[]"),
  specs: z.string().optional().default(""),
  variants: z.string().optional().default("[]"),
});

function parseSpecs(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const idx = line.indexOf(":");
    if (idx < 1) continue;
    const key = line.slice(0, idx).trim().slice(0, 60);
    const value = line.slice(idx + 1).trim().slice(0, 200);
    if (key && value) out[key] = value;
  }
  return out;
}

function parseMoney(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isNaN(n) || n < 0 ? null : Math.round(n * 100) / 100;
}

export async function saveProduct(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { db, business } = await bizDb();
  const parsed = productSchema.safeParse(fields(fd));
  if (!parsed.success) return fail(firstError(parsed.error));
  const v = parsed.data;

  if (v.subcategory_id && !v.category_id) return fail("Choose a category before choosing a subcategory.");
  if (v.subcategory_id) {
    const { data: sub } = await db.from("subcategories").select("category_id").eq("id", v.subcategory_id).maybeSingle();
    if (!sub || sub.category_id !== v.category_id) return fail("That subcategory doesn't belong to the chosen category.");
  }

  let images: string[] = [];
  try { images = JSON.parse(v.images).filter((u: unknown) => typeof u === "string" && isOwnImageUrl(u)).slice(0, 8); } catch {}

  let variantRows: z.infer<typeof variantRowSchema>[] = [];
  try {
    const raw = JSON.parse(v.variants);
    const check = z.array(variantRowSchema).max(20).safeParse(raw);
    if (check.success) variantRows = check.data;
  } catch {}

  let price: number | null = null;
  let oldPrice: number | null = null;
  if (v.price_type !== "contact") {
    if (!v.price.trim()) return fail("Enter a base price.");
    const n = parseMoney(v.price);
    if (n === null) return fail("Enter a valid price.");
    price = n;
    if (v.old_price.trim()) {
      oldPrice = parseMoney(v.old_price);
      if (oldPrice === null) return fail("Enter a valid old price.");
      if (oldPrice <= price) return fail("Old price must be higher than the current price.");
    }
  }

  const variants: { label: string; price: number | null; old_price: number | null; in_stock: boolean; sort_order: number }[] = [];
  for (let i = 0; i < variantRows.length; i++) {
    const r = variantRows[i];
    const vp = parseMoney(r.price);
    if (r.price.trim() && vp === null) return fail(`Enter a valid price for "${r.label}".`);
    const vop = parseMoney(r.oldPrice);
    if (r.oldPrice.trim() && vop === null) return fail(`Enter a valid old price for "${r.label}".`);
    if (vp !== null && vop !== null && vop <= vp) return fail(`Old price must be higher than the price for "${r.label}".`);
    variants.push({ label: r.label.trim(), price: vp, old_price: vop, in_stock: r.inStock, sort_order: i });
  }

  const inStock = fd.get("in_stock") === "on";
  const status = fd.get("status") === "draft" ? "draft" : "published";
  const productFields = {
    category_id: v.category_id || null, subcategory_id: v.subcategory_id || null,
    name: v.name, description: v.description || null, price, old_price: oldPrice, price_type: v.price_type,
    badge: v.badge || null, images, in_stock: inStock, status, specs: parseSpecs(v.specs),
  };

  // save_product writes the product and replaces its variants in one transaction (see 0007).
  const save = (slug: string | null) => db.rpc("save_product", {
    p_id: v.id || null, p_business_id: business.id, p_slug: slug, p_fields: productFields, p_variants: variants,
  });

  let productSlug = "";
  if (v.id) {
    const { data, error } = await save(null);
    if (error) return fail(readableDbError(error.message, error.code));
    productSlug = (data as { slug: string }).slug;
  } else {
    // Product slugs are unique across the whole marketplace (see 0006), so a clash with any
    // shop's product gets a short random suffix. The unique index is the final arbiter.
    const productSlugBase = slugify(v.name).slice(0, 110) || "product";
    for (let i = 0; i < 5 && !productSlug; i++) {
      const { data, error } = await save(i === 0 ? productSlugBase : `${productSlugBase}-${Math.random().toString(36).slice(2, 7)}`);
      if (data) productSlug = (data as { slug: string }).slug;
      else if (error?.code !== "23505") return fail(readableDbError(error?.message, error?.code));
    }
    if (!productSlug) return fail("Could not create a link for this product. Try a slightly different name.");
  }

  revalidatePath("/dashboard/products");
  refreshShop(business.slug, [productSlug]);
  if (v.id) return done("Product saved.");
  redirect("/dashboard/products");
}

export async function deleteProduct(fd: FormData) {
  const { db, business } = await bizDb();
  const id = z.string().uuid().safeParse(fd.get("id"));
  if (!id.success) return;
  const { data: removed } = await db.from("products").delete().eq("id", id.data).eq("business_id", business.id).select("slug").maybeSingle();
  revalidatePath("/dashboard/products");
  refreshShop(business.slug, removed ? [removed.slug] : []);
}

export async function toggleProductStock(fd: FormData) {
  const { db, business } = await bizDb();
  const id = z.string().uuid().safeParse(fd.get("id"));
  const inStock = fd.get("in_stock") === "true";
  if (!id.success) return;
  const { data: row } = await db.from("products").update({ in_stock: !inStock }).eq("id", id.data).eq("business_id", business.id).select("slug").maybeSingle();
  revalidatePath("/dashboard/products");
  refreshShop(business.slug, row ? [row.slug] : []);
}

export async function toggleProductStatus(fd: FormData) {
  const { db, business } = await bizDb();
  const id = z.string().uuid().safeParse(fd.get("id"));
  const status = fd.get("status");
  if (!id.success) return;
  const { data: row } = await db.from("products").update({ status: status === "published" ? "draft" : "published" }).eq("id", id.data).eq("business_id", business.id).select("slug").maybeSingle();
  revalidatePath("/dashboard/products");
  refreshShop(business.slug, row ? [row.slug] : []);
}

// Copies a product (with its options) as a hidden draft, then opens it for editing. Handy for
// near-identical items. The plan's product limit still applies (enforced in the database).
export async function duplicateProduct(fd: FormData) {
  const { db, business } = await bizDb();
  const id = z.string().uuid().safeParse(fd.get("id"));
  if (!id.success) return;
  const [{ data: p }, { data: variants }] = await Promise.all([
    db.from("products").select("name, description, category_id, subcategory_id, price, old_price, price_type, badge, images, in_stock, specs")
      .eq("id", id.data).eq("business_id", business.id).maybeSingle(),
    db.from("product_variants").select("label, price, old_price, in_stock, sort_order").eq("product_id", id.data).order("sort_order"),
  ]);
  if (!p) return;

  const name = `${p.name} (copy)`.slice(0, 120);
  const slugBase = slugify(name).slice(0, 110) || "product";
  let newId = "";
  for (let i = 0; i < 5 && !newId; i++) {
    const { data, error } = await db.rpc("save_product", {
      p_id: null, p_business_id: business.id, p_slug: i === 0 ? slugBase : `${slugBase}-${Math.random().toString(36).slice(2, 7)}`,
      p_fields: { ...p, name, status: "draft" }, p_variants: variants ?? [],
    });
    if (data) newId = (data as { id: string }).id;
    else if (error?.code !== "23505") redirect(`/dashboard/products?error=${encodeURIComponent(readableDbError(error?.message, error?.code))}`);
  }
  if (!newId) redirect(`/dashboard/products?error=${encodeURIComponent("Could not copy this product. Try again.")}`);
  revalidatePath("/dashboard/products");
  redirect(`/dashboard/products/${newId}/edit?copied=1`);
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
  const { error: verifyError } = await db.auth.signInWithPassword({ email: user.email, password: parsed.data.current_password });
  if (verifyError) return fail("Current password is incorrect.");

  const { error } = await db.auth.updateUser({ password: parsed.data.new_password });
  if (error) return fail("Could not update the password. Try again.");
  return done("Password updated.");
}
