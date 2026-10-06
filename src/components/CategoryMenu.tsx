"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight, Menu } from "lucide-react";
import { useCategories } from "@/lib/categories-context";
import { CategoryIcon } from "@/lib/icon-map";
import styles from "./CategoryMenu.module.css";

// Desktop "All categories" mega-menu: categories on the left, the hovered category's
// subcategories on the right. Opens on click (and hover for mouse users); Esc or clicking
// outside closes it.
export default function CategoryMenu() {
  const categories = useCategories();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const onClick = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onClick); };
  }, [open]);

  // Close when the page changes.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) { setLastPath(pathname); setOpen(false); }

  const current = categories[active];
  const enter = () => { clearTimeout(hoverTimer.current); hoverTimer.current = setTimeout(() => setOpen(true), 120); };
  const leave = () => { clearTimeout(hoverTimer.current); hoverTimer.current = setTimeout(() => setOpen(false), 220); };

  return (
    <div ref={root} className={styles.root} onMouseEnter={enter} onMouseLeave={leave}>
      <button type="button" className={styles.trigger} aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((o) => !o)}>
        <Menu size={18} aria-hidden="true" /> All categories <ChevronDown size={16} aria-hidden="true" className={open ? styles.flip : undefined} />
      </button>
      {open && categories.length > 0 && (
        <div className={styles.panel} role="menu">
          <ul className={styles.list}>
            {categories.map((c, i) => (
              <li key={c.slug}>
                <Link href={`/products?category=${c.slug}`} role="menuitem" className={i === active ? styles.itemOn : styles.item}
                  onMouseEnter={() => setActive(i)} onFocus={() => setActive(i)}>
                  <CategoryIcon name={c.icon} size={18} />
                  <span>{c.name}</span>
                  {c.subs.length > 0 && <ChevronRight size={15} aria-hidden="true" className={styles.chev} />}
                </Link>
              </li>
            ))}
          </ul>
          {current && (
            <div className={styles.sub}>
              <Link href={`/products?category=${current.slug}`} className={styles.subHead}>{current.name} <ChevronRight size={16} aria-hidden="true" /></Link>
              {current.subs.length > 0 ? (
                <ul className={styles.subGrid}>
                  {current.subs.map((s) => (
                    <li key={s.slug}><Link href={`/products?category=${current.slug}&subcategory=${s.slug}`} role="menuitem">{s.name}</Link></li>
                  ))}
                </ul>
              ) : (
                <p className={styles.none}>Browse everything in {current.name}.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
