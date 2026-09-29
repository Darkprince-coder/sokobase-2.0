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
  const { data: business } = await supabase
    .from("businesses")
    .select("id, slug, name, location, whatsapp, status")
    .eq("owner_id", user.id)
    .maybeSingle();
  return { supabase, user, business };
}
