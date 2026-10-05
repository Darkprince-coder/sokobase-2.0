"use client";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";

type TurnstileApi = { render: (el: HTMLElement, opts: Record<string, unknown>) => string; remove: (id: string) => void };
declare global { interface Window { turnstile?: TurnstileApi } }

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

// Adds a hidden "cf-turnstile-response" field to the surrounding form. Usually invisible: Cloudflare
// only shows a checkbox when a visitor looks suspicious. Tokens are single-use, so pass a value that
// changes after each submit (e.g. the action state) as resetKey to get a fresh one.
export default function Turnstile({ resetKey }: { resetKey?: unknown }) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!SITE_KEY || !ready || !ref.current || !window.turnstile) return;
    const id = window.turnstile.render(ref.current, { sitekey: SITE_KEY, appearance: "interaction-only", "response-field-name": "cf-turnstile-response" });
    return () => window.turnstile?.remove(id);
  }, [ready, resetKey]);

  if (!SITE_KEY) return null;
  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onReady={() => setReady(true)} />
      <div ref={ref} />
    </>
  );
}
