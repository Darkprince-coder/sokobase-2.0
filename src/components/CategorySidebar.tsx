import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { categories } from "@/lib/categories";
import styles from "./CategorySidebar.module.css";

export default function CategorySidebar() {
  return (
    <aside className={styles.side} aria-label="Shop by category">
      <ul>
        {categories.map(({ slug, label, Icon }) => (
          <li key={slug}>
            <Link href={`/products?category=${slug}`} className={styles.link}>
              <Icon size={18} aria-hidden="true" className={styles.icon} />
              <span>{label}</span>
              <ChevronRight size={16} aria-hidden="true" className={styles.chev} />
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
