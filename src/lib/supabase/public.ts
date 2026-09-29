import { createClient } from "@supabase/supabase-js";

// Anonymous client with no cookies, for public pages (so they can be statically cached).
// Only reads what the anon role is granted; never use it for signed-in data.
export function createPublicClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
