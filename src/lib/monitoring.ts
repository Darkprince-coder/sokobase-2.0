// Error monitoring with Sentry, off until NEXT_PUBLIC_SENTRY_DSN is set. The SDK is only downloaded
// when monitoring is on, and in the browser only after the page is interactive, so it never slows
// the first load. No personal data is sent (no IPs, cookies or form contents).
export const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN ?? "";

export const sentryOptions = {
  dsn: SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  sendDefaultPii: false,
  tracesSampleRate: 0, // errors only; no performance tracing
  // Noise from flaky mobile connections, browser extensions and old browsers, not bugs in SokoBase.
  ignoreErrors: [
    "Failed to fetch", "Load failed", "NetworkError when attempting to fetch resource", "The network connection was lost",
    "ResizeObserver loop", "Non-Error promise rejection captured", "AbortError",
  ],
  denyUrls: [/^chrome-extension:\/\//, /^moz-extension:\/\//, /^safari-(web-)?extension:\/\//],
};

// Report an error caught by an error boundary (error.tsx / global-error.tsx).
export function reportError(error: unknown) {
  if (!SENTRY_DSN || typeof window === "undefined") return;
  import("@sentry/nextjs").then((Sentry) => Sentry.captureException(error)).catch(() => {});
}
