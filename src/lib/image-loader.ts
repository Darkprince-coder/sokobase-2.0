"use client";

// Every next/image is served straight from Cloudinary's CDN, resized to the exact width the browser
// asks for, in the best format it supports (AVIF/WebP) at automatic quality. This is faster than
// re-processing images on our own server and uses no hosting image-optimisation quota.
//
// Optional framing hint, appended to the src as "#hint" (removed before the request):
//   #fill  square, smart crop that keeps the subject centred (product cards)
//   #pad   square, whole image visible on white (product gallery)
//   #logo  square, whole logo visible on white (shop logos shown in a circle)
//   #cover keep proportions; the frame crops with object-fit (shop cover photos)
const FRAMING: Record<string, string> = {
  fill: "c_fill,g_auto,ar_1:1",
  pad: "c_pad,b_white,ar_1:1",
  logo: "c_pad,b_white,ar_1:1",
  cover: "c_limit",
};

export default function cloudinaryLoader({ src, width, quality }: { src: string; width: number; quality?: number }) {
  const [url, hint] = src.split("#");
  const match = url.match(/^https:\/\/res\.cloudinary\.com\/([^/]+)\/image\/upload\/(.+)$/);
  if (!match) return url;
  const framing = FRAMING[hint ?? ""] ?? "c_limit";
  const transform = ["f_auto", quality ? `q_${quality}` : "q_auto", framing, `w_${width}`].join(",");
  return `https://res.cloudinary.com/${match[1]}/image/upload/${transform}/${match[2]}`;
}
