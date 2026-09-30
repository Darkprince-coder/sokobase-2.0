"use client";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useCategories } from "@/lib/categories-context";
import { CategoryIcon } from "@/lib/icon-map";
import styles from "./CategorySidebar.module.css";

export default function CategorySidebar() {
  const categories = useCategories();
  return (
    <aside className={styles.side} aria-label="Shop by category">
      <ul>
        {categories.map((c) => (
          <li key={c.slug}>
            <Link href={`/products?category=${c.slug}`} className={styles.link}>
              <span className={styles.icon}><CategoryIcon name={c.icon} size={18} /></span>
              <span>{c.name}</span>
              <ChevronRight size={16} aria-hidden="true" className={styles.chev} />
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
