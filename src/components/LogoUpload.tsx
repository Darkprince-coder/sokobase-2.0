"use client";
import { useRef, useState } from "react";
import { uploadImage, UploadError } from "@/lib/upload";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import Button from "./Button";
import styles from "./LogoUpload.module.css";

type Props = { value: string; onChange: (url: string) => void; label?: string; inviteCode?: string };

// Single-image uploader (shop logo, cover photo). Pass inviteCode during registration, before sign-in.
export default function LogoUpload({ value, onChange, label = "logo", inviteCode }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      onChange(await uploadImage(file, { inviteCode }));
    } catch (e) {
      setError(e instanceof UploadError ? e.message : "Upload failed. Try again, or skip this for now.");
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
          <img src={value} alt={`Business ${label}`} />
        ) : (
          <span>No {label}</span>
        )}
      </div>
      <div className={styles.actions}>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => onFile(e.target.files?.[0])} />
        <Button type="button" size="sm" variant="soft" disabled={busy} icon={busy ? <Loader2 size={15} className={styles.spin} /> : <ImagePlus size={15} />} onClick={() => input.current?.click()}>
          {busy ? "Uploading" : value ? `Replace ${label}` : `Upload ${label} (optional)`}
        </Button>
        {value && <Button type="button" size="sm" variant="ghost" icon={<Trash2 size={15} />} onClick={() => onChange("")}>Remove</Button>}
      </div>
      {error && <p role="alert" className={styles.error}>{error}</p>}
    </div>
  );
}
