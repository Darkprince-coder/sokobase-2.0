import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";
import { deleteFolderImages, deleteImages } from "@/lib/cloudinary-admin";

type Db = ReturnType<typeof createAdminClient>;
export type RemovableBusiness = { id: string; owner_id: string; logo_url: string | null; cover_url: string | null };

// Removes a shop completely: the business row (cascading to products, variants, subscriptions,
// categories, reports and clicks), the owner's login and every photo in Cloudinary.
// Used by Admin > Delete shop, Reject sign-up and the daily clean-up of abandoned sign-ups.
export async function purgeBusiness(db: Db, b: RemovableBusiness): Promise<{ ok: boolean; products: number; photos: number }> {
  // Collect photo URLs before the rows disappear.
  const { data: products } = await db.from("products").select("id, images").eq("business_id", b.id);
  const productIds = (products ?? []).map((p) => p.id as string);
  const { data: variants } = productIds.length
    ? await db.from("product_variants").select("image_url").in("product_id", productIds)
    : { data: [] as { image_url: string | null }[] };
  const urls = [b.logo_url, b.cover_url, ...(products ?? []).flatMap((p) => (p.images as string[]) ?? []), ...(variants ?? []).map((v) => v.image_url)]
    .filter((u): u is string => typeof u === "string" && u.length > 0);

  const { error } = await db.from("businesses").delete().eq("id", b.id);
  if (error) return { ok: false, products: productIds.length, photos: urls.length };
  // The owner's login (and profile, via cascade). Their invite rows stay, unlinked, as history.
  await db.auth.admin.deleteUser(b.owner_id).catch(() => null);

  // Free Cloudinary storage (best effort; never blocks).
  await deleteImages(urls);
  await deleteFolderImages(`sokobase/shops/${b.id}/`);
  return { ok: true, products: productIds.length, photos: urls.length };
}
