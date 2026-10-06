import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { site } from "@/lib/site";
import { jsonLdString } from "@/lib/jsonld";
import styles from "./Breadcrumbs.module.css";

export type Crumb = { label: string; href?: string };

// "Home > Category > Product" trail. The last item is the current page (not a link).
// Also emits BreadcrumbList structured data so Google can show the trail in results.
export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  const trail: Crumb[] = [{ label: "Home", href: "/" }, ...items];
  const ld = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: trail.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.label, ...(c.href ? { item: `${site.url}${c.href}` } : {}) })),
  };
  return (
    <nav aria-label="Breadcrumb" className={styles.nav}>
      <ol className={styles.list}>
        {trail.map((c, i) => {
          const last = i === trail.length - 1;
          return (
            <li key={`${c.label}-${i}`} className={styles.item}>
              {i > 0 && <ChevronRight size={14} aria-hidden="true" className={styles.sep} />}
              {c.href && !last ? <Link href={c.href}>{c.label}</Link> : <span aria-current={last ? "page" : undefined}>{c.label}</span>}
            </li>
          );
        })}
      </ol>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(ld) }} />
    </nav>
  );
}
