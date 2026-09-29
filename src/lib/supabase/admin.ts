import "server-only";
import { createClient } from "@supabase/supabase-js";

// Bypasses RLS. Server only, and only after you have verified the caller (requireSuperAdmin or a valid invite).
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
