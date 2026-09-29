import { createBrowserClient } from "@supabase/ssr";

// Browser client. Uses the publishable/anon key only; access is limited by RLS and grants.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
