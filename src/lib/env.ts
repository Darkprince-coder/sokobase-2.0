import { z } from "zod";

// Checked once at server start (src/instrumentation.ts). Required variables stop a production
// server with a clear message instead of failing later with a vague runtime error; recommended
// ones only warn, because the app still works (with a feature switched off) without them.
const required = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: z.string().min(1),
});

const requiredInProduction = z.object({
  NEXT_PUBLIC_SITE_HOST: z.string().min(3),
  NEXT_PUBLIC_PORTAL_HOST: z.string().min(3),
  NEXT_PUBLIC_PORTAL_URL: z.string().url(),
});

const recommended: Record<string, string> = {
  NEXT_PUBLIC_SITE_URL: "canonical URLs fall back to https://sokobase.co.ke",
  NEXT_PUBLIC_SUPPORT_WHATSAPP: "every 'Talk to us on WhatsApp' and renew button is hidden",
  CLOUDINARY_API_KEY: "uploads use the unsigned preset instead of signed uploads",
  CLOUDINARY_API_SECRET: "uploads use the unsigned preset instead of signed uploads",
  ORDER_CLICK_SALT: "order-click fingerprints are salted with the service role key instead",
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: "bot protection on sign-in and password reset is off",
  TURNSTILE_SECRET_KEY: "bot protection on sign-in and password reset is off",
};

export function checkEnv() {
  const env = process.env;
  const problems: string[] = [];
  const collect = (schema: z.ZodObject) => {
    const r = schema.safeParse(env);
    if (!r.success) for (const i of r.error.issues) problems.push(`${i.path.join(".")}: ${env[String(i.path[0])] ? "invalid" : "missing"}`);
  };
  collect(required);
  if (env.NODE_ENV === "production") collect(requiredInProduction);

  const missing = Object.entries(recommended).filter(([k]) => !env[k]);
  if (missing.length) {
    console.warn(`[env] Optional settings not set:\n${missing.map(([k, why]) => `  - ${k}: ${why}`).join("\n")}`);
  }
  if (problems.length) {
    const message = `[env] Missing or invalid environment variables:\n${problems.map((p) => `  - ${p}`).join("\n")}`;
    if (env.NODE_ENV === "production") throw new Error(message);
    console.warn(message);
  }
}
