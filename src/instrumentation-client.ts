import { SENTRY_DSN, sentryOptions } from "@/lib/monitoring";

// Browser error monitoring: loads Sentry after the page is interactive (see lib/monitoring.ts).
if (SENTRY_DSN) {
  const start = () => {
    import("@sentry/nextjs")
      .then((Sentry) => Sentry.init({ ...sentryOptions, integrations: (defaults) => defaults.filter((i) => i.name !== "BrowserTracing") }))
      .catch(() => {});
  };
  if ("requestIdleCallback" in window) requestIdleCallback(start, { timeout: 4000 });
  else setTimeout(start, 2000);
}
