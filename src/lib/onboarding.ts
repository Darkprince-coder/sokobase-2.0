import "server-only";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/slug";
import { normalizeKePhone } from "@/lib/phone";
import { isOwnImageUrl } from "@/lib/cloudinary";

// Shared by invite sign-up (/join) and open sign-up (/signup): the shop details form and the
// account + shop creation, with clean rollback if any step fails.
export const shopFormSchema = z
  .object({
    name: z.string().trim().min(2, "Business name is too short").max(80),
    owner_name: z.string().trim().max(80).optional().default(""),
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

export type ShopForm = z.infer<typeof shopFormSchema>;

/** Categories (1 to 3) and the WhatsApp number in the format the app stores, or an error message. */
export function checkShopExtras(v: ShopForm): { categoryIds: string[]; whatsapp: string } | { error: string } {
  let categoryIds: string[];
  try {
    const check = z.array(z.string().uuid()).min(1, "Choose at least one category").max(3, "Choose up to 3 categories").safeParse(JSON.parse(v.category_ids));
    if (!check.success) return { error: check.error.issues[0]?.message ?? "Choose 1 to 3 categories." };
    categoryIds = check.data;
  } catch {
    return { error: "Choose at least one category." };
  }
  const whatsapp = normalizeKePhone(v.whatsapp);
  if (!whatsapp) return { error: "Enter a valid Kenyan WhatsApp number, e.g. 07XXXXXXXX." };
  return { categoryIds, whatsapp };
}

type Db = ReturnType<typeof createAdminClient>;
type Created = { ok: true; userId: string; businessId: string; slug: string; rollback: () => Promise<void> } | { ok: false; error: string };

/** Creates the login, profile, shop and its categories. No subscription: callers add one (invite) or not (pending). */
export async function createShopAccount(db: Db, v: ShopForm, extras: { categoryIds: string[]; whatsapp: string; requestedPlanId?: string | null }): Promise<Created> {
  const base = slugify(v.name) || "shop";
  let slug = base;
  for (let i = 0; i < 6; i++) {
    const { data: taken } = await db.from("businesses").select("id").eq("slug", slug).maybeSingle();
    if (!taken) break;
    if (i === 5) return { ok: false, error: "Could not create a shop link. Try a different business name." };
    slug = `${base}-${Math.random().toString(36).slice(2, 5)}`;
  }

  const { data: created, error: userError } = await db.auth.admin.createUser({ email: v.email, password: v.password, email_confirm: true });
  if (userError || !created.user) {
    return { ok: false, error: userError?.message.includes("already") ? "An account with that email already exists. Sign in instead, or use another email." : "Could not create the account." };
  }
  const userId = created.user.id;
  let businessId = "";
  const rollback = async () => {
    if (businessId) await db.from("businesses").delete().eq("id", businessId);
    await db.auth.admin.deleteUser(userId);
  };

  const { error: profileError } = await db.from("profiles").insert({ id: userId, role: "business_owner", full_name: v.owner_name || v.name });
  if (profileError) { await rollback(); return { ok: false, error: "Could not create the account. Try again." }; }

  const { data: business, error: bizError } = await db.from("businesses")
    .insert({
      owner_id: userId, slug, name: v.name, county_id: v.county_id, location: v.location, whatsapp: extras.whatsapp,
      logo_url: v.logo_url || null, status: "active", ...(extras.requestedPlanId ? { requested_plan_id: extras.requestedPlanId } : {}),
    })
    .select("id").single();
  if (bizError || !business) { await rollback(); return { ok: false, error: "Could not create your shop. Try again." }; }
  businessId = business.id as string;

  const { error: catError } = await db.from("business_categories").insert(extras.categoryIds.map((category_id) => ({ business_id: businessId, category_id })));
  if (catError) { await rollback(); return { ok: false, error: "Could not save your categories. Try again." }; }

  return { ok: true, userId, businessId, slug, rollback };
}
