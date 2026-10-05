import "server-only";
import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionState } from "@/lib/action-state";
import { slugify } from "@/lib/slug";

export type { ActionState };
export { slugify };

// Every admin page and server action calls this first. Server actions are public HTTP endpoints,
// so the super admin check must happen inside each one, not only in the layout.
export async function adminDb() {
  const { user } = await requireSuperAdmin();
  return { db: createAdminClient(), user };
}

export const fail = (error: string): ActionState => ({ error });

type Db = ReturnType<typeof createAdminClient>;
// Records who changed what (admin_audit_log, service role only). Never blocks the action itself.
export async function audit(db: Db, actorId: string, action: string, target?: { type: string; id?: string | null }, details: Record<string, unknown> = {}) {
  const { error } = await db.from("admin_audit_log").insert({ actor_id: actorId, action, target_type: target?.type ?? null, target_id: target?.id ?? null, details });
  if (error) console.error("[audit] failed to record", action, error.message);
}
export const done = (message: string, data?: Record<string, string>): ActionState => ({ ok: true, message, data });


// Public pages read settings, categories and shops; refresh them after an admin change.
export const refreshPublic = () => revalidatePath("/", "layout");
