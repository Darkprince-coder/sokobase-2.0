"use client";
import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Camera, Loader2, Star, X } from "lucide-react";
import { uploadImage, UploadError } from "@/lib/upload";
import styles from "./ProductForm.module.css";

const MAX = 8;

// Product photos: pick several at once (or take one with the camera on a phone), reorder with
// the arrows, first photo is the cover shown on product cards.
export default function ProductImages({ value, onChange }: { value: string[]; onChange: (urls: string[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState("");
  const room = MAX - value.length;

  async function onFiles(list: FileList | null) {
    if (!list?.length) return;
    setError("");
    const files = [...list].slice(0, room);
    if (list.length > room) setError(`Only ${MAX} photos per product. The first ${room} were added.`);
    let urls = [...value];
    setUploading(files.length);
    for (const file of files) {
      try {
        urls = [...urls, await uploadImage(file)];
        onChange(urls);
      } catch (e) {
        setError(e instanceof UploadError ? e.message : "A photo failed to upload. Try again.");
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (input.current) input.current.value = "";
  }

  const move = (from: number, to: number) => {
    const next = [...value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  return (
    <div>
      <div className={styles.photoGrid}>
        {value.map((url, i) => (
          <figure key={url} className={styles.photo}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url.replace("/image/upload/", "/image/upload/c_fill,g_auto,w_240,h_240,f_auto,q_auto/")} alt={`Photo ${i + 1}`} />
            {i === 0 && <span className={styles.coverTag}>Cover</span>}
            <button type="button" className={styles.photoRemove} aria-label={`Remove photo ${i + 1}`} onClick={() => onChange(value.filter((_, j) => j !== i))}><X size={14} /></button>
            {value.length > 1 && (
              <div className={styles.photoTools}>
                <button type="button" aria-label="Move left" disabled={i === 0} onClick={() => move(i, i - 1)}><ArrowLeft size={14} /></button>
                {i !== 0 && <button type="button" aria-label="Make cover photo" onClick={() => move(i, 0)}><Star size={14} /></button>}
                <button type="button" aria-label="Move right" disabled={i === value.length - 1} onClick={() => move(i, i + 1)}><ArrowRight size={14} /></button>
              </div>
            )}
          </figure>
        ))}
        {Array.from({ length: uploading }, (_, i) => (
          <div key={`up-${i}`} className={`${styles.photo} ${styles.photoBusy}`}><Loader2 size={22} className={styles.spin} aria-hidden="true" /><span>Uploading…</span></div>
        ))}
        {room > uploading && (
          <button type="button" className={styles.photoAdd} onClick={() => input.current?.click()}>
            <Camera size={24} aria-hidden="true" />
            <strong>{value.length ? "Add more" : "Add photos"}</strong>
            <span>{value.length}/{MAX}</span>
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => onFiles(e.target.files)} />
      <p className={styles.hint}>Clear photos sell faster: good light, plain background. The first photo is the cover.</p>
      {error && <p role="alert" className={styles.fieldError}>{error}</p>}
    </div>
  );
}
