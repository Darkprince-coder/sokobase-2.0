import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import ProductCard from "./ProductCard";
import type { Product } from "@/lib/types";
import styles from "./ProductSection.module.css";

type Props = { title: string; href: string; products: Product[]; layout?: "rail" | "grid"; icon?: ReactNode; tone?: "default" | "hot" };

export default function ProductSection({ title, href, products, layout = "grid", icon, tone = "default" }: Props) {
  return (
    <section className={`container ${styles.section}`}>
      <div className={`${styles.card} ${tone === "hot" ? styles.hot : ""}`}>
        <header className={styles.head}>
          <h2>{icon}{title}</h2>
          <Link href={href} className={styles.all}>See all<ChevronRight size={16} aria-hidden="true" /></Link>
        </header>
        <div className={layout === "rail" ? styles.rail : styles.grid}>
          {products.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
        </div>
      </div>
    </section>
  );
}
