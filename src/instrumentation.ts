import type { Instrumentation } from "next";
import { SENTRY_DSN, sentryOptions } from "@/lib/monitoring";

export async function register() {
  // Node.js runtime only: the proxy runs separately and reads just the public host variables.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { checkEnv } = await import("@/lib/env");
    checkEnv();
    if (SENTRY_DSN) (await import("@sentry/nextjs")).init(sentryOptions);
  }
}

// Server errors (pages, server actions, route handlers) go to Sentry when monitoring is on.
export const onRequestError: Instrumentation.onRequestError = async (...args) => {
  if (!SENTRY_DSN || process.env.NEXT_RUNTIME !== "nodejs") return;
  (await import("@sentry/nextjs")).captureRequestError(...args);
};
