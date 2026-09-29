import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// The business/admin portal (login, admin, dashboard, join) lives on its own hostname
// (portal.sokobase.co.ke) so it never appears on the public marketplace domain and is
// never linked from a customer-facing page. In development (no real subdomains) this
// gating is skipped so everything is reachable on localhost as before.
const PORTAL_HOST = process.env.NEXT_PUBLIC_PORTAL_HOST ?? "";
const SITE_HOST = process.env.NEXT_PUBLIC_SITE_HOST ?? "";
const PORTAL_PATHS = ["/login", "/admin", "/dashboard", "/join"];
const isPortalPath = (path: string) => PORTAL_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

// Next.js 16 calls this proxy.ts. On Next.js 15 or older, rename the file to middleware.ts
// and this function to `middleware` (see Session 2 instructions).
export async function middleware(request: NextRequest) {
  if (process.env.NODE_ENV !== "production" || !PORTAL_HOST) return updateSession(request);

  const host = request.headers.get("host") ?? "";
  const path = request.nextUrl.pathname;
  const onPortal = host.startsWith(PORTAL_HOST);

  if (isPortalPath(path) && !onPortal) {
    // Never reveal these routes on the public domain: send visitors home quietly.
    return NextResponse.redirect(new URL("/", request.url));
  }
  if (onPortal) {
    if (path === "/") return NextResponse.redirect(new URL("/login", request.url));
    if (!isPortalPath(path)) return NextResponse.redirect(`https://${SITE_HOST}${path}`);
    return updateSession(request);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|icons/|sw\\.js|manifest\\.webmanifest).*)"] };
