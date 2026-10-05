"use client";
import { useRef, useState } from "react";
import { uploadImage, UploadError } from "@/lib/upload";
import { Loader2, Plus, X } from "lucide-react";
import styles from "./dash.module.css";

const MAX = 4;

export default function ProductImages({ value, onChange }: { value: string[]; onChange: (urls: string[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      onChange([...value, await uploadImage(file)]);
    } catch (e) {
      setError(e instanceof UploadError ? e.message : "Upload failed. Try again.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div>
      <div className={styles.imgGrid}>
        {value.map((url, i) => (
          <div key={url + i} className={styles.imgTile}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" />
            <button type="button" className={styles.imgRemove} aria-label="Remove image" onClick={() => onChange(value.filter((_, idx) => idx !== i))}>
              <X size={13} />
            </button>
          </div>
        ))}
        {value.length < MAX && (
          <button type="button" className={styles.imgAdd} disabled={busy} onClick={() => input.current?.click()}>
            {busy ? <Loader2 size={18} className={styles.spin} /> : <Plus size={18} />}
            {busy ? "Uploading" : "Add photo"}
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      <p className={styles.hint} style={{ marginTop: 6 }}>Up to {MAX} photos. The first photo is shown on the product card.</p>
      {error && <p role="alert" className={styles.msgErr} style={{ marginTop: 8 }}>{error}</p>}
    </div>
  );
}
