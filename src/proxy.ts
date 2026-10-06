import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// The business/admin portal (login, admin, dashboard, join) lives on its own hostname
// (portal.sokobase.co.ke) so it never appears on the public marketplace domain and is
// never linked from a customer-facing page. In development (no real subdomains) this
// gating is skipped so everything is reachable on localhost.
const PORTAL_HOST = process.env.NEXT_PUBLIC_PORTAL_HOST ?? "";
const SITE_HOST = process.env.NEXT_PUBLIC_SITE_HOST ?? "";
const PORTAL_PATHS = ["/login", "/admin", "/dashboard", "/join", "/forgot-password", "/reset-password", "/auth"];
const isPortalPath = (path: string) => PORTAL_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
// Shared by both hosts: route handlers and root-level files such as /icon.svg or /robots.txt.
// /offline is the service worker's fallback page, needed by both the customer and the business app.
const isShared = (path: string) => path.startsWith("/api/") || path === "/offline" || /\.[a-z0-9]+$/i.test(path);
// Short address to say on a call or put in a WhatsApp message: sokobase.co.ke/biz opens the dashboard.
const isBizShortcut = (path: string) => path === "/biz" || path === "/biz/";

export async function proxy(request: NextRequest) {
  if (process.env.NODE_ENV !== "production" || !PORTAL_HOST) {
    if (isBizShortcut(request.nextUrl.pathname)) return NextResponse.redirect(new URL("/dashboard", request.url));
    return updateSession(request);
  }

  const host = (request.headers.get("host") ?? "").split(":")[0].toLowerCase();
  const path = request.nextUrl.pathname;
  const onPortal = host === PORTAL_HOST.toLowerCase();
  if (isBizShortcut(path)) return NextResponse.redirect(`https://${PORTAL_HOST}/dashboard`);

  if (onPortal) {
    if (path === "/") return NextResponse.redirect(new URL("/login", request.url));
    if (isPortalPath(path)) {
      // Belt and braces with the pages' own noindex: nothing on the portal belongs in search results.
      const response = await updateSession(request);
      response.headers.set("X-Robots-Tag", "noindex, nofollow");
      return response;
    }
    if (isShared(path)) return NextResponse.next();
    return NextResponse.redirect(`https://${SITE_HOST}${path}${request.nextUrl.search}`);
  }
  // Never reveal portal routes on the public domain: send visitors home quietly.
  if (isPortalPath(path)) return NextResponse.redirect(new URL("/", request.url));
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|icons/|sw\\.js|manifest\\.webmanifest).*)"] };
