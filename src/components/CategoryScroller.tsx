"use client";
import Link from "next/link";
import { useCategories } from "@/lib/categories-context";
import { CategoryIcon } from "@/lib/icon-map";
import styles from "./CategoryScroller.module.css";

export default function CategoryScroller() {
  const categories = useCategories();
  return (
    <section aria-label="Categories" className={styles.wrap}>
      <div className="container">
        <h2 className={styles.h}>Shop by category</h2>
        <ul className={styles.list}>
          {categories.map((c) => (
            <li key={c.slug}>
              <Link href={`/products?category=${c.slug}`} className={styles.item}>
                <span className={styles.circle}><CategoryIcon name={c.icon} size={24} /></span>
                <span className={styles.label}>{c.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
