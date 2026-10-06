"use client";
import { useActionState, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2 } from "lucide-react";
import Button from "@/components/Button";
import ImageUpload from "./ImageUpload";
import { saveHeroSlides } from "@/app/admin/actions";
import type { ActionState } from "@/lib/action-state";
import styles from "./admin.module.css";
import { keepFormSubmit } from "@/lib/keep-form";

export type Slide = { id: string; title: string; subtitle: string; ctaLabel: string; href: string; imageUrl: string; imageOnly?: boolean };
const newId = () => Math.random().toString(36).slice(2, 10);

export default function HeroEditor({ initial }: { initial: Slide[] }) {
  const [slides, setSlides] = useState<Slide[]>(initial);
  const [state, action, pending] = useActionState<ActionState, FormData>(saveHeroSlides, {});

  const patch = (id: string, p: Partial<Slide>) => setSlides((s) => s.map((x) => (x.id === id ? { ...x, ...p } : x)));
  const move = (i: number, d: number) => setSlides((s) => {
    const j = i + d;
    if (j < 0 || j >= s.length) return s;
    const n = [...s]; [n[i], n[j]] = [n[j], n[i]]; return n;
  });

  return (
    <form onSubmit={keepFormSubmit(action)}>
      <input type="hidden" name="slides" value={JSON.stringify(slides)} />
      {slides.length === 0 && <p className={styles.empty}>No slides. The default green banner shows on the home page.</p>}
      <AnimatePresence initial={false}>
        {slides.map((s, i) => (
          <motion.div key={s.id} layout className={styles.slide} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.2 }}>
            <div className={styles.slideHead}>
              <h3>Slide {i + 1}</h3>
              <div className={styles.rowActions}>
                <Button type="button" size="sm" variant="ghost" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up"><ArrowUp size={16} /></Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => move(i, 1)} disabled={i === slides.length - 1} aria-label="Move down"><ArrowDown size={16} /></Button>
                <Button type="button" size="sm" variant="outline" className={styles.dangerBtn} onClick={() => setSlides((x) => x.filter((y) => y.id !== s.id))} aria-label="Delete slide"><Trash2 size={16} /></Button>
              </div>
            </div>
            <ImageUpload value={s.imageUrl} onChange={(imageUrl) => patch(s.id, { imageUrl })} />
            <p className={styles.hint}>Best size 1600 x 680 px. Keep the subject on the right; text sits on the left.</p>
            <label className={styles.check} style={{ margin: "8px 0" }}>
              <input type="checkbox" checked={!!s.imageOnly} onChange={(e) => patch(s.id, { imageOnly: e.target.checked })} />
              My image already has its own text (show the image only; the title is used for screen readers)
            </label>
            <div className={styles.grid2}>
              <label className={styles.field}>Title<input value={s.title} maxLength={90} onChange={(e) => patch(s.id, { title: e.target.value })} required /></label>
              <label className={styles.field}>Subtitle (optional)<input value={s.subtitle} maxLength={160} onChange={(e) => patch(s.id, { subtitle: e.target.value })} /></label>
              <label className={styles.field} hidden={!!s.imageOnly}>Button text (optional)<input value={s.ctaLabel} maxLength={30} onChange={(e) => patch(s.id, { ctaLabel: e.target.value })} placeholder="Shop now" /></label>
              <label className={styles.field}>{s.imageOnly ? "Link when tapped" : "Button link"}<input value={s.href} maxLength={200} onChange={(e) => patch(s.id, { href: e.target.value })} placeholder="/products?badge=offer" /></label>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {state.error && <p role="alert" className={styles.msgErr} style={{ marginBottom: 12 }}>{state.error}</p>}
      {state.ok && state.message && <p role="status" className={styles.msgOk} style={{ marginBottom: 12 }}>{state.message}</p>}
      <div className={styles.btnRow}>
        <Button type="button" variant="soft" disabled={slides.length >= 8} icon={<Plus size={16} />} onClick={() => setSlides((s) => [...s, { id: newId(), title: "", subtitle: "", ctaLabel: "", href: "", imageUrl: "" }])}>Add slide</Button>
        <Button type="submit" disabled={pending} icon={pending ? <Loader2 size={16} className={styles.spin} /> : undefined}>{pending ? "Saving" : "Save slides"}</Button>
      </div>
    </form>
  );
}
