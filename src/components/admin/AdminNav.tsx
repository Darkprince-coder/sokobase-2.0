"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Store, Ticket, CreditCard, Tags, Images } from "lucide-react";
import styles from "./admin.module.css";

const ITEMS = [
  { href: "/admin", label: "Overview", Icon: LayoutDashboard },
  { href: "/admin/businesses", label: "Businesses", Icon: Store },
  { href: "/admin/invites", label: "Invites", Icon: Ticket },
  { href: "/admin/plans", label: "Plans", Icon: CreditCard },
  { href: "/admin/categories", label: "Categories", Icon: Tags },
  { href: "/admin/hero", label: "Hero slides", Icon: Images },
];

export default function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className={styles.nav} aria-label="Admin">
      {ITEMS.map(({ href, label, Icon }) => {
        const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
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
