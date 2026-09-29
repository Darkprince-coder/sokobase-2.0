import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Next.js 16 uses proxy.ts. On Next.js 15 or older, rename this file to middleware.ts
// and rename the function to `middleware`. Public pages are excluded so they stay fast.
export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = { matcher: ["/admin/:path*", "/dashboard/:path*", "/login"] };
