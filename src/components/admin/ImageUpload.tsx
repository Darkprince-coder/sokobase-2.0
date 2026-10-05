"use client";
import { useRef, useState } from "react";
import { uploadImage, UploadError } from "@/lib/upload";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import Button from "@/components/Button";
import styles from "./admin.module.css";

// Hero slide image upload (signed, see lib/upload.ts). Returns the https secure_url.
export default function ImageUpload({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      onChange(await uploadImage(file));
    } catch (e) {
      setError(e instanceof UploadError ? e.message : "Upload failed. Try again.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div>
      <div className={styles.thumb}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {value ? <img src={value} alt="" /> : <span>No image, gradient will show</span>}
      </div>
      <div className={styles.upload} style={{ marginTop: 8 }}>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => onFile(e.target.files?.[0])} />
        <Button type="button" size="sm" variant="soft" disabled={busy} icon={busy ? <Loader2 size={15} className={styles.spin} /> : <ImagePlus size={15} />} onClick={() => input.current?.click()}>
          {busy ? "Uploading" : value ? "Replace image" : "Upload image"}
        </Button>
        {value && <Button type="button" size="sm" variant="ghost" icon={<Trash2 size={15} />} onClick={() => onChange("")}>Remove</Button>}
      </div>
      {error && <p role="alert" className={styles.msgErr} style={{ marginTop: 8 }}>{error}</p>}
    </div>
  );
}
