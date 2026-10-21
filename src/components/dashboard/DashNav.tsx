"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Store, Package, ShieldCheck, BarChart3 } from "lucide-react";
import styles from "./dash.module.css";

const ITEMS = [
  { href: "/dashboard", label: "Overview", Icon: LayoutDashboard },
  { href: "/dashboard/profile", label: "Shop profile", Icon: Store },
  { href: "/dashboard/products", label: "Products", Icon: Package },
  { href: "/dashboard/insights", label: "Insights", Icon: BarChart3 },
  { href: "/dashboard/security", label: "Security", Icon: ShieldCheck },
];

export default function DashNav() {
  const pathname = usePathname();
  return (
    <nav className={styles.nav} aria-label="Dashboard">
      {ITEMS.map(({ href, label, Icon }) => {
        const active = href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
        return (
          <Link key={href} href={href} className={`${styles.navLink} ${active ? styles.navActive : ""}`} aria-current={active ? "page" : undefined}>
            <Icon size={18} aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
