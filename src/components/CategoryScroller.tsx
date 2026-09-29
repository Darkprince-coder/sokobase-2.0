import Link from "next/link";
import { categories } from "@/lib/categories";
import styles from "./CategoryScroller.module.css";

export default function CategoryScroller() {
  return (
    <section aria-label="Categories" className={styles.wrap}>
      <div className="container">
        <h2 className={styles.h}>Shop by category</h2>
        <ul className={styles.list}>
          {categories.map(({ slug, label, Icon }) => (
            <li key={slug}>
              <Link href={`/products?category=${slug}`} className={styles.item}>
                <span className={styles.circle}><Icon size={24} aria-hidden="true" /></span>
                <span className={styles.label}>{label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
