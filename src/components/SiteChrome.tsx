"use client";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Logo from "./Logo";
import { site } from "@/lib/site";
import { useEffect } from "react";
import { rememberLanding } from "./ViewTracker";

// Business sign-in, password and invite pages: just the logo and the form, no shop navigation.
const AUTH_PAGES = ["/login", "/signup", "/forgot-password", "/reset-password", "/join"];
const isAuthPage = (path: string) => AUTH_PAGES.some((p) => path === p || path.startsWith(`${p}/`));

// Public pages get the header, footer and bottom nav. The admin area has its own shell.
export default function SiteChrome({ header, footer, bottomNav, children }: { header: ReactNode; footer: ReactNode; bottomNav: ReactNode; children: ReactNode }) {
  const pathname = usePathname();
  // Remembers the page this visit started on, so later product/shop views count as "browsing
  // SokoBase" in sellers' Insights (see ViewTracker).
  useEffect(() => { rememberLanding(); }, []);
  if (pathname.startsWith("/admin") || pathname.startsWith("/dashboard")) return <main id="main">{children}</main>;
  if (isAuthPage(pathname)) {
    return (
      <div className="authShell">
        <header className="authShellHead"><Logo size={36} href={site.url} /></header>
        <main id="main">{children}</main>
      </div>
    );
  }
  // Product pages have their own sticky "Order on WhatsApp" bar, so the bottom nav steps aside
  // there instead of the two bars stacking or overlapping.
  const productPage = /^\/products\/[^/]+$/.test(pathname);
  return (
    <div className={productPage ? "siteShell" : "siteShell hasBottomNav"}>
      {header}
      <main id="main">{children}</main>
      {footer}
      {!productPage && bottomNav}
    </div>
  );
}
