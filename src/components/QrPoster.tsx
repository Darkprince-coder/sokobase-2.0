"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Download, QrCode } from "lucide-react";
import styles from "./QrPoster.module.css";

const GREEN = "#1F7A4D";
const INK = "#14201B";

// Shows the shop's QR code and builds a printable A5-ratio poster (PNG) for counters, shop
// windows, flyers and delivery bags. Everything is generated in the browser.
export default function QrPoster({ url, shopName, compact = false }: { url: string; shopName: string; compact?: boolean }) {
  const [src, setSrc] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(url, { margin: 1, width: 360, color: { dark: INK, light: "#ffffff" }, errorCorrectionLevel: "M" }).then(setSrc).catch(() => setSrc(""));
  }, [url]);

  async function download() {
    setBusy(true);
    try {
      const W = 1240, H = 1754; // A5-ish at ~150 dpi, prints sharp
      const canvas = document.createElement("canvas");
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#FAF7F2"; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = GREEN; ctx.fillRect(0, 0, W, 300);

      ctx.textAlign = "center";
      ctx.fillStyle = "#ffffff";
      ctx.font = "700 64px 'Space Grotesk', system-ui, sans-serif";
      ctx.fillText("Shop with us online", W / 2, 140);
      ctx.font = "500 40px Inter, system-ui, sans-serif";
      ctx.fillText("Scan, browse, and order on WhatsApp", W / 2, 215);

      ctx.fillStyle = INK;
      ctx.font = "700 76px 'Space Grotesk', system-ui, sans-serif";
      wrap(ctx, shopName, W / 2, 440, W - 160, 88);

      const qr = await loadImage(await QRCode.toDataURL(url, { margin: 2, width: 760, color: { dark: INK, light: "#ffffff" }, errorCorrectionLevel: "M" }));
      const size = 760, x = (W - size) / 2, y = 560;
      ctx.fillStyle = "#ffffff"; roundRect(ctx, x - 30, y - 30, size + 60, size + 60, 36); ctx.fill();
      ctx.drawImage(qr, x, y, size, size);

      ctx.fillStyle = GREEN;
      ctx.font = "600 44px 'IBM Plex Mono', ui-monospace, monospace";
      ctx.fillText(url.replace(/^https?:\/\//, ""), W / 2, y + size + 120);
      ctx.fillStyle = "#5F6B64";
      ctx.font = "500 36px Inter, system-ui, sans-serif";
      ctx.fillText("Powered by SokoBase", W / 2, H - 80);

      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `${shopName.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "shop"}-qr-poster.png`;
      a.click();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={compact ? styles.compact : styles.wrap}>
      <div className={styles.qr}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {src ? <img src={src} alt={`QR code linking to ${shopName} on SokoBase`} width={180} height={180} /> : <QrCode size={64} aria-hidden="true" />}
      </div>
      <div className={styles.text}>
        <strong>Your shop QR code</strong>
        <p>Print it for your counter, window, flyers or delivery bags. Customers scan it to see your products.</p>
        <button type="button" className={styles.btn} onClick={download} disabled={!src || busy}>
          <Download size={16} aria-hidden="true" /> {busy ? "Preparing…" : "Download printable poster"}
        </button>
      </div>
    </div>
  );
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = src; });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w; } else line = test;
  }
  lines.push(line);
  lines.slice(0, 2).forEach((l, i) => ctx.fillText(l, x, y + i * lineHeight));
}
