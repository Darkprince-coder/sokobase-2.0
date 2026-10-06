"use client";
import { useEffect, useState } from "react";
import { Download, Share, SquarePlus, X } from "lucide-react";
import { BIZ_APP_NAME } from "@/lib/portal-app";
import styles from "./dash.module.css";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
const DISMISS_KEY = "sb-biz-install-dismissed";

// Invites the owner to put SokoBase Biz on their home screen, so they never hunt for the link.
// Android/Chrome: one-tap install. iPhone has no install button, so show the two Safari steps.
// Hidden once installed (opened from the icon) or after "Not now".
export default function InstallBizApp() {
  const [evt, setEvt] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    let dismissed = false;
    try { dismissed = localStorage.getItem(DISMISS_KEY) === "1"; } catch {}
    if (standalone || dismissed) return;
    const isIos = /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    // Wait for the browser's own signal (it only fires when the app can really be installed).
    const show = () => setHidden(false);
    // iPhone never sends that signal: show the steps after a short pause, once the page has settled.
    const iosTimer = isIos ? window.setTimeout(() => { setIos(true); show(); }, 1200) : 0;
    const onPrompt = (e: Event) => { e.preventDefault(); setEvt(e as InstallEvent); show(); };
    const onInstalled = () => setHidden(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => { window.clearTimeout(iosTimer); window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, []);

  if (hidden || (!evt && !ios)) return null;
  const dismiss = () => { try { localStorage.setItem(DISMISS_KEY, "1"); } catch {} setHidden(true); };

  return (
    <section className={styles.installCard} aria-label={`Install ${BIZ_APP_NAME}`}>
      <span className={styles.installIcon} aria-hidden="true" />
      <div className={styles.installText}>
        <strong>Put {BIZ_APP_NAME} on your home screen</strong>
        {ios ? (
          <ol className={styles.installSteps}>
            <li>Tap the Share button <Share size={15} aria-label="Share" /> in Safari.</li>
            <li>Scroll and tap <SquarePlus size={15} aria-hidden="true" /> <b>Add to Home Screen</b>, then <b>Add</b>.</li>
          </ol>
        ) : (
          <span>Open your shop in one tap, no need to look for the link.</span>
        )}
        {evt && (
          <button type="button" className={styles.installBtn} onClick={async () => { await evt.prompt(); const { outcome } = await evt.userChoice; if (outcome === "accepted") setHidden(true); setEvt(null); }}>
            <Download size={16} aria-hidden="true" /> Install app
          </button>
        )}
      </div>
      <button type="button" className={styles.installLater} onClick={dismiss} aria-label="Not now"><X size={18} aria-hidden="true" /></button>
    </section>
  );
}
