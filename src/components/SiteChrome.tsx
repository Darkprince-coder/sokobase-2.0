"use client";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

// Public pages get the header, footer and bottom nav. The admin area has its own shell.
export default function SiteChrome({ header, footer, bottomNav, children }: { header: ReactNode; footer: ReactNode; bottomNav: ReactNode; children: ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/admin") || pathname.startsWith("/dashboard")) return <main id="main">{children}</main>;
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
