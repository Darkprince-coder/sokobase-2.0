"use client";
import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import {
  OPTION_PRESETS, MAX_GROUPS, MAX_COMBOS, comboCount, comboLabel, isColourGroup, photoGroupOf, swatchFor,
  type Combo, type OptionGroup,
} from "@/lib/variants";
import styles from "./ProductForm.module.css";

export type ComboOverride = { price: string; oldPrice: string; inStock: boolean };

type Props = {
  groups: OptionGroup[];
  onGroups: (g: OptionGroup[]) => void;
  combos: Combo[];
  overrides: Record<string, ComboOverride>;
  onOverride: (key: string, patch: Partial<ComboOverride>) => void;
  keyOf: (c: Combo) => string;
  samePrice: boolean;
  onSamePrice: (v: boolean) => void;
  priceOnRequest: boolean;
  basePrice: string;
  photos: string[];
  colourPhotos: Record<string, string>;
  onColourPhoto: (colour: string, url: string | null) => void;
  error?: string;
};

// Step 3 of the product form: colours / sizes / types, every combination, prices and stock.
export default function OptionsEditor(p: Props) {
  const [drafts, setDrafts] = useState<string[]>(["", ""]);
  const used = new Set(p.groups.map((g) => g.name.toLowerCase()));
  const colourGroup = photoGroupOf(p.groups); // photos link to the first option group (colour, type...)
  const total = comboCount(p.groups);

  const setGroup = (i: number, patch: Partial<OptionGroup>) => p.onGroups(p.groups.map((g, j) => (j === i ? { ...g, ...patch } : g)));
  const addValues = (i: number, raw: string) => {
    const parts = raw.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
    if (!parts.length) return;
    const g = p.groups[i];
    const have = new Set(g.values.map((v) => v.toLowerCase()));
    setGroup(i, { values: [...g.values, ...parts.filter((v) => !have.has(v.toLowerCase()))] });
    setDrafts((d) => d.map((x, j) => (j === i ? "" : x)));
  };
  const toggleValue = (i: number, value: string) => {
    const g = p.groups[i];
    const has = g.values.some((v) => v.toLowerCase() === value.toLowerCase());
    setGroup(i, { values: has ? g.values.filter((v) => v.toLowerCase() !== value.toLowerCase()) : [...g.values, value] });
  };
  const addGroup = (name: string) => p.onGroups([...p.groups, { name, values: [] }]);

  return (
    <div className={styles.options}>
      {p.groups.map((g, i) => {
        const preset = OPTION_PRESETS.find((x) => x.name.toLowerCase() === g.name.toLowerCase());
        return (
          <div key={i} className={styles.group}>
            <div className={styles.groupHead}>
              <label className={styles.groupName}>
                <span>Option {i + 1}</span>
                <input value={g.name} maxLength={30} onChange={(e) => setGroup(i, { name: e.target.value })} placeholder="e.g. Colour" />
              </label>
              <button type="button" className={styles.iconBtn} aria-label={`Remove ${g.name || "option"}`} onClick={() => p.onGroups(p.groups.filter((_, j) => j !== i))}><Trash2 size={16} /></button>
            </div>

            <div className={styles.chips} aria-label={`${g.name} values`}>
              {g.values.map((v) => (
                <span key={v} className={styles.chipOn}>
                  {isColourGroup(g.name) && swatchFor(v) && <i className={styles.swatch} style={{ background: swatchFor(v)! }} />}
                  {v}
                  <button type="button" aria-label={`Remove ${v}`} onClick={() => toggleValue(i, v)}><X size={13} /></button>
                </span>
              ))}
              <span className={styles.chipEntry}>
                <input className={styles.chipInput} value={drafts[i]} placeholder={g.values.length ? "Add another…" : `Type e.g. ${preset?.values[0] ?? "Large"}, tap Add`}
                  aria-label={`Add a ${g.name || "value"}`}
                  onChange={(e) => {
                    const v = e.target.value;
                    // A comma (some phone keyboards have no Enter) also adds the value.
                    if (v.includes(",")) addValues(i, v); else setDrafts((d) => d.map((x, j) => (j === i ? v : x)));
                  }}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addValues(i, drafts[i]); } }}
                  onBlur={() => addValues(i, drafts[i])} enterKeyHint="done" />
                {drafts[i].trim() && (
                  <button type="button" className={styles.chipAdd} onMouseDown={(e) => e.preventDefault()} onClick={() => addValues(i, drafts[i])}>
                    <Plus size={15} aria-hidden="true" /> Add
                  </button>
                )}
              </span>
            </div>
            {preset && preset.values.length > 0 && (
              <div className={styles.quick}>
                <span>Quick add:</span>
                {preset.values.filter((v) => !g.values.some((x) => x.toLowerCase() === v.toLowerCase())).map((v) => (
                  <button key={v} type="button" onClick={() => toggleValue(i, v)}>+ {v}</button>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {p.groups.length < MAX_GROUPS && (
        <div className={styles.addGroup}>
          <span>{p.groups.length ? "Add another option:" : "What changes?"}</span>
          {OPTION_PRESETS.filter((x) => !used.has(x.name.toLowerCase())).map((x) => (
            <button key={x.name} type="button" onClick={() => addGroup(x.name)}><Plus size={14} aria-hidden="true" />{x.name}</button>
          ))}
        </div>
      )}

      {total > MAX_COMBOS && <p className={styles.fieldError}>That makes {total} combinations. The limit is {MAX_COMBOS}; only the first {MAX_COMBOS} are kept.</p>}

      {colourGroup && colourGroup.values.length > 0 && p.photos.length > 0 && (
        <div className={styles.colourPhotos}>
          <h4>Photo for each {colourGroup.name.toLowerCase()} <small>(optional)</small></h4>
          <p className={styles.hint}>Tap one of your photos for each {colourGroup.name.toLowerCase()}. When a customer picks it, that photo is shown.</p>
          {colourGroup.values.map((c) => (
            <div key={c} className={styles.colourRow}>
              <span className={styles.colourName}>{isColourGroup(colourGroup.name) && swatchFor(c) && <i className={styles.swatch} style={{ background: swatchFor(c)! }} />}{c}</span>
              <div className={styles.pickRow}>
                {p.photos.map((url) => (
                  <button key={url} type="button" aria-pressed={p.colourPhotos[c] === url} aria-label={`Use this photo for ${c}`}
                    className={p.colourPhotos[c] === url ? styles.pickOn : styles.pick} onClick={() => p.onColourPhoto(c, p.colourPhotos[c] === url ? null : url)}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url.replace("/image/upload/", "/image/upload/c_fill,g_auto,w_96,h_96,f_auto,q_auto/")} alt="" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {p.combos.length > 0 && (
        <div className={styles.combos}>
          {!p.priceOnRequest && (
            <label className={styles.switchRow}>
              <input type="checkbox" checked={p.samePrice} onChange={(e) => p.onSamePrice(e.target.checked)} />
              <span><strong>Same price for all options</strong><small>Leave off to give each option its own price. Switch on if every option costs the same.</small></span>
            </label>
          )}
          <div className={styles.comboHead}>
            <span>{p.combos.length} combination{p.combos.length === 1 ? "" : "s"}</span>
            {!p.samePrice && !p.priceOnRequest && p.basePrice && (
              <button type="button" className={styles.linkBtn} onClick={() => p.combos.forEach((c) => p.onOverride(p.keyOf(c), { price: p.basePrice }))}>Use KSh {p.basePrice} for all</button>
            )}
          </div>
          <ul className={styles.comboList}>
            {p.combos.map((c) => {
              const key = p.keyOf(c);
              const o = p.overrides[key] ?? { price: "", oldPrice: "", inStock: true };
              return (
                <li key={key} className={o.inStock ? styles.combo : `${styles.combo} ${styles.comboOut}`}>
                  <span className={styles.comboLabel}>{comboLabel(c.attributes, p.groups)}</span>
                  {!p.samePrice && !p.priceOnRequest && (
                    <label className={styles.comboPrice}>
                      <span className="visually-hidden">Price for {comboLabel(c.attributes, p.groups)}</span>
                      <em>KSh</em>
                      <input inputMode="decimal" value={o.price} placeholder={p.basePrice || "Price"} onChange={(e) => p.onOverride(key, { price: e.target.value })} />
                    </label>
                  )}
                  <label className={styles.stock}>
                    <input type="checkbox" checked={o.inStock} onChange={(e) => p.onOverride(key, { inStock: e.target.checked })} />
                    <span>{o.inStock ? "In stock" : "Sold out"}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {p.error && <p role="alert" className={styles.fieldError}>{p.error}</p>}
    </div>
  );
}
