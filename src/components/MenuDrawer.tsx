"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Flame, Heart, Home, Info, LayoutGrid, Mail, Menu, Store, X } from "lucide-react";
import { useCategories } from "@/lib/categories-context";
import { CategoryIcon } from "@/lib/icon-map";
import { LogoMark } from "./Logo";
import styles from "./MenuDrawer.module.css";

// Site menu (all screen sizes). A native <dialog> gives focus trapping, Esc to close and an
// accessible modal for free. Categories expand to show their subcategories.
export default function MenuDrawer() {
  const dialog = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();
  const categories = useCategories();
  const [open, setOpen] = useState<string | null>(null);

  const close = () => dialog.current?.close();
  // Close after navigating (links inside the drawer change the route).
  useEffect(() => { dialog.current?.close(); }, [pathname]);

  return (
    <>
      <button type="button" className={styles.trigger} aria-label="Open menu" onClick={() => dialog.current?.showModal()}>
        <Menu size={22} aria-hidden="true" />
      </button>
      <dialog ref={dialog} className={styles.drawer} aria-label="Menu"
        onClick={(e) => { if (e.target === dialog.current) close(); }}>
        <div className={styles.panel}>
          <header className={styles.head}>
            <span className={styles.brand}><LogoMark size={30} /> Menu</span>
            <button type="button" className={styles.close} aria-label="Close menu" onClick={close}><X size={22} /></button>
          </header>

          <nav aria-label="Main" className={styles.quick}>
            <Link href="/"><Home size={18} aria-hidden="true" />Home</Link>
            <Link href="/products"><LayoutGrid size={18} aria-hidden="true" />All products</Link>
            <Link href="/products?deals=1&sort=discount" className={styles.hot}><Flame size={18} aria-hidden="true" />Deals</Link>
            <Link href="/stores"><Store size={18} aria-hidden="true" />Shops</Link>
            <Link href="/saved"><Heart size={18} aria-hidden="true" />Saved items</Link>
          </nav>

          <h2 className={styles.h2}>Categories</h2>
          <ul className={styles.cats}>
            {categories.map((c) => {
              const expanded = open === c.slug;
              return (
                <li key={c.slug}>
                  <div className={styles.catRow}>
                    <Link href={`/products?category=${c.slug}`} className={styles.catLink}>
                      <span className={styles.catIcon}><CategoryIcon name={c.icon} size={18} /></span>
                      <span className={styles.catName}>{c.name}</span>
                    </Link>
                    {c.subs.length > 0 && (
                      <button type="button" className={styles.expand} aria-expanded={expanded} aria-label={`${expanded ? "Hide" : "Show"} ${c.name} subcategories`}
                        onClick={() => setOpen(expanded ? null : c.slug)}>
                        <ChevronDown size={18} className={expanded ? styles.flip : undefined} />
                      </button>
                    )}
                  </div>
                  {expanded && (
                    <ul className={styles.subs}>
                      <li><Link href={`/products?category=${c.slug}`}>All {c.name}</Link></li>
                      {c.subs.map((s) => <li key={s.slug}><Link href={`/products?category=${c.slug}&subcategory=${s.slug}`}>{s.name}</Link></li>)}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>

          <Link href="/sell" className={styles.sell}>
            <strong>Sell on SokoBase</strong>
            <span>Get your shop online with one link</span>
          </Link>

          <nav aria-label="Help" className={styles.help}>
            <Link href="/about"><Info size={16} aria-hidden="true" />About SokoBase</Link>
            <Link href="/contact"><Mail size={16} aria-hidden="true" />Contact us</Link>
            <span className={styles.legal}><Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link></span>
          </nav>
        </div>
      </dialog>
    </>
  );
}
