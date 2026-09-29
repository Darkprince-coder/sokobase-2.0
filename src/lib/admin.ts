import "server-only";
import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionState } from "@/lib/action-state";

export type { ActionState };

// Every admin page and server action calls this first. Server actions are public HTTP endpoints,
// so the super admin check must happen inside each one, not only in the layout.
export async function adminDb() {
  const { user } = await requireSuperAdmin();
  return { db: createAdminClient(), user };
}

export const fail = (error: string): ActionState => ({ error });
export const done = (message: string, data?: Record<string, string>): ActionState => ({ ok: true, message, data });

export const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

// Public pages read settings, categories and shops; refresh them after an admin change.
export const refreshPublic = () => revalidatePath("/", "layout");
