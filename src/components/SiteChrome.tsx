"use client";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

// Public pages get the header, footer and bottom nav. The admin area has its own shell.
export default function SiteChrome({ header, footer, bottomNav, children }: { header: ReactNode; footer: ReactNode; bottomNav: ReactNode; children: ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return <main id="main">{children}</main>;
  return (
    <div className="hasBottomNav">
      {header}
      <main id="main">{children}</main>
      {footer}
      {bottomNav}
    </div>
  );
}
