"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, Plus, Store, UserRound } from "lucide-react";
import styles from "./dash.module.css";

const TABS = [
  { href: "/dashboard", label: "Home", Icon: LayoutDashboard, exact: true },
  { href: "/dashboard/products", label: "Products", Icon: Package },
  { href: "/dashboard/products/new", label: "Add", Icon: Plus, primary: true },
  { href: "/dashboard/profile", label: "My shop", Icon: Store },
  { href: "/dashboard/security", label: "Account", Icon: UserRound },
];

// Phone navigation for business owners: big thumb-friendly tabs with "Add product" in the middle.
// Hidden on the product form, which has its own Save / Publish bar.
export default function DashTabBar() {
  const pathname = usePathname();
  if (pathname.startsWith("/dashboard/products/new") || pathname.endsWith("/edit")) return null;
  return (
    <nav className={styles.tabBar} aria-label="Dashboard">
      {TABS.map(({ href, label, Icon, exact, primary }) => {
        const active = exact ? pathname === href : href === "/dashboard/products" ? pathname === href : pathname.startsWith(href);
        return (
          <Link key={href} href={href} className={primary ? styles.tabAdd : active ? styles.tabOn : styles.tab} aria-current={active ? "page" : undefined}>
            <span className={styles.tabIcon}><Icon size={primary ? 26 : 21} aria-hidden="true" /></span>
            <span>{primary ? "Add product" : label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
