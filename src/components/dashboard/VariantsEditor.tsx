"use client";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import Button from "@/components/Button";
import styles from "./dash.module.css";

export type VariantRow = { id: string; label: string; price: string; oldPrice: string; inStock: boolean };
const newRow = (): VariantRow => ({ id: Math.random().toString(36).slice(2, 9), label: "", price: "", oldPrice: "", inStock: true });

export default function VariantsEditor({ initial }: { initial: VariantRow[] }) {
  const [rows, setRows] = useState<VariantRow[]>(initial);
  const patch = (id: string, p: Partial<VariantRow>) => setRows((r) => r.map((x) => (x.id === id ? { ...x, ...p } : x)));

  return (
    <div className={styles.field}>
      <span>Sizes / colours / options (optional)</span>
      <p className={styles.hint} style={{ marginTop: -2 }}>Leave empty for a single product with one price. Add a row per option, e.g. "42", "Red", "1kg", each with its own price.</p>
      <input type="hidden" name="variants" value={JSON.stringify(rows.filter((r) => r.label.trim()))} />
      {rows.map((r) => (
        <div key={r.id} className={styles.grid2} style={{ marginTop: 8, alignItems: "end" }}>
          <label className={styles.field}><span>Option</span><input value={r.label} maxLength={40} placeholder="e.g. 42" onChange={(e) => patch(r.id, { label: e.target.value })} /></label>
          <label className={styles.field}><span>Price (KSh)</span><input type="number" min={0} value={r.price} onChange={(e) => patch(r.id, { price: e.target.value })} /></label>
          <label className={styles.field}><span>Old price (optional)</span><input type="number" min={0} value={r.oldPrice} onChange={(e) => patch(r.id, { oldPrice: e.target.value })} /></label>
          <div className={styles.rowActions}>
            <label className={styles.check}><input type="checkbox" checked={r.inStock} onChange={(e) => patch(r.id, { inStock: e.target.checked })} /> In stock</label>
            <Button type="button" size="sm" variant="outline" className={styles.dangerBtn} onClick={() => setRows((x) => x.filter((y) => y.id !== r.id))} aria-label="Remove option"><Trash2 size={15} /></Button>
          </div>
        </div>
      ))}
      <div style={{ marginTop: 10 }}>
        <Button type="button" size="sm" variant="soft" icon={<Plus size={15} />} onClick={() => setRows((r) => [...r, newRow()])}>Add option</Button>
      </div>
    </div>
  );
}
