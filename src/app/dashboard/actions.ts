"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { bizDb, done, fail, readableDbError, refreshShop, type ActionState } from "@/lib/dashboard";
import { createClient } from "@/lib/supabase/server";
import { normalizeKePhone } from "@/lib/phone";
import { slugify } from "@/lib/slug";
import { isOwnImageUrl } from "@/lib/cloudinary";
import { buildProductPayload } from "@/lib/product-input";

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
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: issue?.message ?? "Check the form and try again.", field: String(issue?.path[0] ?? "") || undefined };
  }
  const v = parsed.data;
  const whatsapp = normalizeKePhone(v.whatsapp);
  if (!whatsapp) return { error: "Enter a valid Kenyan WhatsApp number, e.g. 0712 345 678.", field: "whatsapp" };
  if ((v.logo_url && !isOwnImageUrl(v.logo_url)) || (v.cover_url && !isOwnImageUrl(v.cover_url))) return { error: "Upload images using the upload buttons.", field: "logo_url" };

  let categoryIds: string[] = [];
  try {
    const check = z.array(z.string().uuid()).min(1, "Choose at least one category").max(3, "Choose up to 3 categories").safeParse(JSON.parse(v.category_ids));
    if (!check.success) return { error: check.error.issues[0]?.message ?? "Choose 1 to 3 categories.", field: "category_ids" };
    categoryIds = check.data;
  } catch {
    return { error: "Choose at least one category.", field: "category_ids" };
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
  return done("Saved. Your shop page is updated.");
}

// ---------- Products ----------
const jsonArray = <T,>(raw: FormDataEntryValue | null, schema: z.ZodType<T>, fallback: T): T => {
  try {
    const r = schema.safeParse(JSON.parse(String(raw ?? "")));
    return r.success ? r.data : fallback;
  } catch {
    return fallback;
  }
};
const comboSchema = z.object({
  attributes: z.record(z.string().max(30), z.string().max(30)),
  price: z.union([z.number(), z.string(), z.null()]).transform((v) => (v === "" || v == null ? null : Number(v))),
  oldPrice: z.union([z.number(), z.string(), z.null()]).transform((v) => (v === "" || v == null ? null : Number(v))),
  inStock: z.boolean(),
  imageUrl: z.string().max(500).nullable(),
});

export async function saveProduct(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { db, business } = await bizDb();
  const id = z.string().uuid().safeParse(fd.get("id")).data ?? null;

  const result = buildProductPayload({
    name: String(fd.get("name") ?? ""),
    description: String(fd.get("description") ?? ""),
    categoryId: String(fd.get("category_id") ?? ""),
    subcategoryId: String(fd.get("subcategory_id") ?? ""),
    badge: String(fd.get("badge") ?? ""),
    images: jsonArray(fd.get("images"), z.array(z.string()).max(20), []),
    price: String(fd.get("price") ?? ""),
    oldPrice: String(fd.get("old_price") ?? ""),
    priceOnRequest: fd.get("price_on_request") === "1",
    inStock: fd.get("in_stock") !== "0",
    publish: fd.get("intent") !== "draft",
    specs: jsonArray(fd.get("specs"), z.array(z.object({ label: z.string().max(200), value: z.string().max(400) })).max(40), []),
    options: jsonArray(fd.get("options"), z.array(z.object({ name: z.string().max(60), values: z.array(z.string().max(60)).max(40) })).max(4), []),
    combos: jsonArray(fd.get("combos"), z.array(comboSchema).max(200), []),
    samePrice: fd.get("same_price") !== "0",
  }, isOwnImageUrl);
  if (!result.ok) return { error: result.error, field: result.field };
  const { fields, variants } = result.payload;

  if (fields.subcategory_id) {
    const { data: sub } = await db.from("subcategories").select("category_id").eq("id", fields.subcategory_id).maybeSingle();
    if (!sub || sub.category_id !== fields.category_id) return { error: "That subcategory doesn't belong to the chosen category.", field: "category" };
  }

  // save_product writes the product and replaces its variants in one transaction (see 0007/0011).
  const save = (slug: string | null) => db.rpc("save_product", {
    p_id: id, p_business_id: business.id, p_slug: slug, p_fields: fields, p_variants: variants,
  });

  let productSlug = "";
  if (id) {
    const { data, error } = await save(null);
    if (error) return fail(readableDbError(error.message, error.code));
    productSlug = (data as { slug: string }).slug;
  } else {
    // Product slugs are unique across the whole marketplace (see 0006), so a clash with any
    // shop's product gets a short random suffix. The unique index is the final arbiter.
    const productSlugBase = slugify(fields.name).slice(0, 110) || "product";
    for (let i = 0; i < 5 && !productSlug; i++) {
      const { data, error } = await save(i === 0 ? productSlugBase : `${productSlugBase}-${Math.random().toString(36).slice(2, 7)}`);
      if (data) productSlug = (data as { slug: string }).slug;
      else if (error?.code !== "23505") return fail(readableDbError(error?.message, error?.code));
    }
    if (!productSlug) return fail("Could not create a link for this product. Try a slightly different name.");
  }

  revalidatePath("/dashboard/products");
  refreshShop(business.slug, [productSlug]);
  const what = fields.status === "draft" ? "Saved as a draft (hidden from customers)." : "Published. Customers can see it now.";
  if (id) return done(what);
  redirect(`/dashboard/products?saved=${fields.status === "draft" ? "draft" : "published"}`);
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
    db.from("products").select("name, description, category_id, subcategory_id, price, old_price, price_type, badge, images, in_stock, specs, options")
      .eq("id", id.data).eq("business_id", business.id).maybeSingle(),
    db.from("product_variants").select("label, price, old_price, in_stock, sort_order, attributes, image_url").eq("product_id", id.data).order("sort_order"),
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
