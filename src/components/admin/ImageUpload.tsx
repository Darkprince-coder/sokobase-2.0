"use client";
import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import Button from "@/components/Button";
import styles from "./admin.module.css";

const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
const MAX_MB = 5;

// Unsigned Cloudinary upload straight from the browser. Returns the https secure_url.
export default function ImageUpload({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError("");
    if (!CLOUD || !PRESET) return setError("Cloudinary is not configured. Add the two NEXT_PUBLIC_CLOUDINARY_ variables.");
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return setError("Use a JPG, PNG or WebP image.");
    if (file.size > MAX_MB * 1024 * 1024) return setError(`Image must be under ${MAX_MB} MB.`);
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("upload_preset", PRESET);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, { method: "POST", body });
      const json = await res.json();
      if (!res.ok || !json.secure_url) throw new Error();
      onChange(json.secure_url as string);
    } catch {
      setError("Upload failed. Try again.");
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
