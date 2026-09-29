"use client";
import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import Button from "./Button";

type InstallEvent = Event & { prompt: () => Promise<void> };

export default function InstallButton() {
  const [evt, setEvt] = useState<InstallEvent | null>(null);
  useEffect(() => {
    const onPrompt = (e: Event) => { e.preventDefault(); setEvt(e as InstallEvent); };
    const onInstalled = () => setEvt(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, []);
  if (!evt) return null;
  return <Button size="sm" icon={<Download size={16} />} onClick={async () => { await evt.prompt(); setEvt(null); }}>Install app</Button>;
}
