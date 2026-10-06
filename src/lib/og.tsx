import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// Link-preview cards (WhatsApp, Facebook, X, Google). 1200x630 is the size every platform accepts.
export const OG_SIZE = { width: 1200, height: 630 };

const GREEN = "#1F7A4D";
const INK = "#14201B";
const PAPER = "#FAF7F2";

// Cloudinary image as a JPEG at preview size: the renderer cannot read WebP/AVIF, and WhatsApp
// prefers small previews.
export function ogPhoto(url: string | null | undefined, square = 520) {
  const m = url?.match(/^https:\/\/res\.cloudinary\.com\/([^/]+)\/image\/upload\/(.+)$/);
  return m ? `https://res.cloudinary.com/${m[1]}/image/upload/f_jpg,q_80,c_pad,b_white,w_${square},h_${square}/${m[2]}` : null;
}

// Brand fonts bundled with the app (OFL licence): bold Space Grotesk for titles, Inter for text.
let fonts: Promise<{ name: string; data: Buffer; weight: 500 | 700; style: "normal" }[]> | null = null;
const loadFonts = () => (fonts ??= Promise.all([
  readFile(join(process.cwd(), "src/assets/fonts/SpaceGrotesk-Bold.ttf")).then((data) => ({ name: "Display", data, weight: 700 as const, style: "normal" as const })),
  readFile(join(process.cwd(), "src/assets/fonts/Inter-Medium.ttf")).then((data) => ({ name: "Body", data, weight: 500 as const, style: "normal" as const })),
]));

type Card = { eyebrow?: string; title: string; subtitle?: string; price?: string; photo?: string | null; round?: boolean };

export async function ogCard({ eyebrow, title, subtitle, price, photo, round }: Card) {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: PAPER, fontFamily: "Body" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, padding: "56px 56px 48px" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {eyebrow && <div style={{ fontSize: 28, color: GREEN, marginBottom: 18, display: "flex" }}>{eyebrow}</div>}
            <div style={{ fontSize: title.length > 48 ? 52 : 64, fontFamily: "Display", fontWeight: 700, color: INK, lineHeight: 1.08, display: "flex" }}>
              {title.length > 90 ? `${title.slice(0, 88)}…` : title}
            </div>
            {subtitle && <div style={{ fontSize: 30, color: "#3A4A42", marginTop: 20, display: "flex" }}>{subtitle.length > 110 ? `${subtitle.slice(0, 108)}…` : subtitle}</div>}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            {price ? <div style={{ fontSize: 46, fontFamily: "Display", fontWeight: 700, color: GREEN, display: "flex" }}>{price}</div> : <div style={{ display: "flex" }} />}
            <div style={{ display: "flex", alignItems: "center", fontSize: 32, fontFamily: "Display", fontWeight: 700, color: INK }}>
              <svg width="44" height="44" viewBox="0 0 48 48" style={{ marginRight: 12 }}>
                <rect width="48" height="48" rx="11" fill={GREEN} />
                <rect x="11" y="11" width="11.5" height="11.5" rx="2.8" fill="#fff" />
                <rect x="25.5" y="11" width="11.5" height="11.5" rx="2.8" fill="#C97A2B" />
                <path d="M13.8 25.5h20.4a2.8 2.8 0 0 1 2.8 2.8v8.7H28v-4.6a4 4 0 0 0-8 0V37h-9v-8.7a2.8 2.8 0 0 1 2.8-2.8z" fill="#fff" />
              </svg>
              SokoBase
            </div>
          </div>
        </div>
        {photo && (
          <div style={{ width: 560, display: "flex", alignItems: "center", justifyContent: "center", background: "#ffffff" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} width={520} height={520} alt="" style={{ objectFit: "contain", borderRadius: round ? 48 : 24 }} />
          </div>
        )}
      </div>
    ),
    { ...OG_SIZE, fonts: await loadFonts() },
  );
}
