"use client";
import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import Button from "./Button";
import styles from "./LogoUpload.module.css";

const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
const MAX_MB = 5;

export default function LogoUpload({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError("");
    if (!CLOUD || !PRESET) return setError("Image upload is not configured yet.");
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
      setError("Upload failed. Try again, or skip this for now.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.preview}>
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="Business logo" />
        ) : (
          <span>No logo</span>
        )}
      </div>
      <div className={styles.actions}>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => onFile(e.target.files?.[0])} />
        <Button type="button" size="sm" variant="soft" disabled={busy} icon={busy ? <Loader2 size={15} className={styles.spin} /> : <ImagePlus size={15} />} onClick={() => input.current?.click()}>
          {busy ? "Uploading" : value ? "Replace logo" : "Upload logo (optional)"}
        </Button>
        {value && <Button type="button" size="sm" variant="ghost" icon={<Trash2 size={15} />} onClick={() => onChange("")}>Remove</Button>}
      </div>
      {error && <p role="alert" className={styles.error}>{error}</p>}
    </div>
  );
}
