import type { Metadata } from "next";
import { adminDb } from "@/lib/admin";
import HeroEditor, { type Slide } from "@/components/admin/HeroEditor";
import styles from "@/components/admin/admin.module.css";

export const metadata: Metadata = { title: "Hero slides" };

export default async function HeroPage() {
  const { db } = await adminDb();
  const { data } = await db.from("platform_settings").select("value").eq("key", "hero_slides").maybeSingle();
  const initial: Slide[] = (Array.isArray(data?.value) ? data.value : []).map((s: Partial<Slide>, i: number) => ({
    id: s.id ?? `slide-${i + 1}`, title: s.title ?? "", subtitle: s.subtitle ?? "",
    ctaLabel: s.ctaLabel ?? "", href: s.href ?? "", imageUrl: s.imageUrl ?? "", imageOnly: !!s.imageOnly,
  }));
  return (
    <>
      <header className={styles.head}>
        <h1>Hero slides</h1>
        <p className={styles.sub}>The banner at the top of the home page. One slide stays still; two or more rotate automatically and can be swiped on phones. Up to 8 slides.</p>
      </header>
      <HeroEditor initial={initial} />
    </>
  );
}
