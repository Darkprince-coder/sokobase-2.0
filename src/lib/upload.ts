"use client";
// Browser-side image upload used by every uploader (logo, cover, product photos, hero slides).
// 1. Checks type and size. 2. Shrinks large photos on the device (saves customers' and sellers'
// mobile data). 3. Gets a signed upload from /api/upload-signature and posts to Cloudinary.

const MAX_MB = 8; // before shrinking; phone photos are often 3-6 MB
const MAX_SIDE = 1600;
const TYPES = /^image\/(jpeg|png|webp)$/;

export class UploadError extends Error {}

async function shrink(file: File): Promise<Blob> {
  if (typeof createImageBitmap !== "function") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 900 * 1024) { bitmap.close(); return file; }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    // PNG keeps transparency (logos); photos become WebP, much smaller than JPEG at the same quality.
    const type = file.type === "image/png" ? "image/png" : "image/webp";
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.85));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

type Signed = { cloudName: string; apiKey: string; signature: string; timestamp: number; folder: string; allowed_formats: string; transformation: string };

export async function uploadImage(file: File, opts: { inviteCode?: string } = {}): Promise<string> {
  if (!TYPES.test(file.type)) throw new UploadError("Use a JPG, PNG or WebP image.");
  if (file.size > MAX_MB * 1024 * 1024) throw new UploadError(`Image must be under ${MAX_MB} MB.`);

  const body = new FormData();
  body.append("file", await shrink(file), file.name);

  const sig = await fetch("/api/upload-signature", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ inviteCode: opts.inviteCode }),
  });
  let cloud: string | undefined;
  if (sig.ok) {
    const s = (await sig.json()) as Signed;
    cloud = s.cloudName;
    body.append("api_key", s.apiKey);
    body.append("timestamp", String(s.timestamp));
    body.append("signature", s.signature);
    body.append("folder", s.folder);
    body.append("allowed_formats", s.allowed_formats);
    body.append("transformation", s.transformation);
  } else if (sig.status === 501 && process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET) {
    // Signing keys not set yet (development): fall back to the unsigned preset.
    cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    body.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET);
  } else if (sig.status === 401) {
    throw new UploadError("Your session has expired. Sign in again to upload.");
  } else {
    throw new UploadError("Image upload is not configured yet.");
  }
  if (!cloud) throw new UploadError("Image upload is not configured yet.");

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: "POST", body });
  const json = await res.json().catch(() => null);
  if (!res.ok || typeof json?.secure_url !== "string") throw new UploadError("Upload failed. Check your connection and try again.");
  return json.secure_url;
}
