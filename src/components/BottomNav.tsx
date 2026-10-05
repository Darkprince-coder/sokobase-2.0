"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, Store, Heart } from "lucide-react";
import { useWishlist } from "@/lib/wishlist";
import styles from "./BottomNav.module.css";

const ITEMS = [
  { href: "/", label: "Home", Icon: Home },
  { href: "/products", label: "Browse", Icon: LayoutGrid },
  { href: "/stores", label: "Shops", Icon: Store },
  { href: "/saved", label: "Saved", Icon: Heart },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { count } = useWishlist();
  return (
    <nav className={styles.nav} aria-label="Primary">
      {ITEMS.map(({ href, label, Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link key={href} href={href} className={styles.item} aria-current={active ? "page" : undefined}>
            <span className={styles.iconWrap}>
              {active && <span className={styles.pill} aria-hidden="true" />}
              <Icon size={20} className={active ? styles.iconActive : styles.icon} />
              {href === "/saved" && count > 0 && <span className={styles.dot}>{count}</span>}
            </span>
            <span className={active ? styles.labelActive : styles.label}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
