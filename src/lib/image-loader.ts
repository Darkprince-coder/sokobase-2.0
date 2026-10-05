"use client";

// Every next/image is served straight from Cloudinary's CDN, resized to the exact width the browser
// asks for, in the best format it supports (AVIF/WebP) at automatic quality. This is faster than
// re-processing images on our own server and uses no hosting image-optimisation quota.
export default function cloudinaryLoader({ src, width, quality }: { src: string; width: number; quality?: number }) {
  const match = src.match(/^https:\/\/res\.cloudinary\.com\/([^/]+)\/image\/upload\/(.+)$/);
  if (!match) return src;
  const transform = ["f_auto", quality ? `q_${quality}` : "q_auto", "c_limit", `w_${width}`].join(",");
  return `https://res.cloudinary.com/${match[1]}/image/upload/${transform}/${match[2]}`;
}
