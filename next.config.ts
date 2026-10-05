import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";
const supabaseHost = (() => {
  try { return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").host; } catch { return ""; }
})();

// Content Security Policy. Next.js inlines bootstrap scripts, so script-src needs 'unsafe-inline'
// unless every page uses nonces (which would disable static caching). The policy still blocks
// framing, plugins, foreign form targets and calls to unexpected hosts.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"} https://www.googletagmanager.com https://challenges.cloudflare.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://res.cloudinary.com https://www.google-analytics.com https://www.googletagmanager.com",
  "font-src 'self' data:",
  [
    "connect-src 'self'",
    supabaseHost && `https://${supabaseHost} wss://${supabaseHost}`,
    "https://api.cloudinary.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://challenges.cloudflare.com",
  ].filter(Boolean).join(" "),
  "worker-src 'self'",
  "manifest-src 'self'",
  "frame-src https://challenges.cloudflare.com", // Turnstile bot check
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  isProd ? "upgrade-insecure-requests" : "",
].filter(Boolean).join("; ");

const securityHeaders = [
  // Report-only until verified on real devices; then rename to Content-Security-Policy.
  { key: "Content-Security-Policy-Report-Only", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
  ...(isProd ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }] : []),
];

const nextConfig: NextConfig = {
  // Images are resized and converted by Cloudinary (src/lib/image-loader.ts), not by this server.
  images: { loader: "custom", loaderFile: "./src/lib/image-loader.ts", remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }] },
  reactCompiler: true,
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // The service worker must always be re-checked so updates roll out promptly.
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }] },
    ];
  },
};

export default nextConfig;
