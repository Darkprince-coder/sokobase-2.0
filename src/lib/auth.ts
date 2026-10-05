import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser(); // verifies the token with Supabase, never trust getSession() on the server
  return { supabase, user };
}

export async function getRole(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  return (data?.role as "super_admin" | "business_owner" | undefined) ?? null;
}

export async function requireUser() {
  const { supabase, user } = await getSessionUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function requireSuperAdmin() {
  const { supabase, user } = await requireUser();
  if ((await getRole(user.id)) !== "super_admin") redirect("/");
  return { supabase, user };
}

// Returns the signed-in owner's business (null if the account has none yet).
export async function requireBusiness() {
  const { supabase, user } = await requireUser();
  if ((await getRole(user.id)) === "super_admin") redirect("/admin");
  // owner_id is not readable by signed-in users (see 0007), so look the shop up via my_business_id().
  const columns = "id, slug, name, location, whatsapp, status";
  const { data: businessId, error } = await supabase.rpc("my_business_id");
  if (error) {
    // Migration 0007 not applied yet: the old owner_id filter still works until it is.
    const { data: business } = await supabase.from("businesses").select(columns).eq("owner_id", user.id).maybeSingle();
    return { supabase, user, business };
  }
  if (!businessId) return { supabase, user, business: null };
  const { data: business } = await supabase.from("businesses").select(columns).eq("id", businessId as string).maybeSingle();
  return { supabase, user, business };
}
