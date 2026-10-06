"use client";
import { useEffect } from "react";
import { reportError } from "@/lib/monitoring";

// Last-resort error screen if the root layout itself fails. It replaces the whole page, so it
// carries its own <html>, <body> and minimal inline styles (no app CSS is guaranteed to load).
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); reportError(error); }, [error]);
  return (
    <html lang="en-KE">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#FAF7F2", color: "#14201B" }}>
        <main style={{ maxWidth: 480, margin: "0 auto", padding: "80px 20px", textAlign: "center" }}>
          <h1 style={{ fontSize: 26, marginBottom: 12 }}>SokoBase is having trouble</h1>
          <p style={{ color: "#3A4A42", marginBottom: 24 }}>Please check your connection and try again in a moment.</p>
          <button type="button" onClick={reset}
            style={{ background: "#1F7A4D", color: "#fff", border: 0, borderRadius: 999, padding: "12px 24px", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
            Try again
          </button>
          {error.digest && <p style={{ marginTop: 24, fontSize: 12, color: "#5F6B64" }}>Error reference: {error.digest}</p>}
        </main>
      </body>
    </html>
  );
}
