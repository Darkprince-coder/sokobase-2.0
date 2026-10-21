// Where a visitor came from, in plain buckets a seller understands. Pure, so it is unit-tested.
export type Source = "whatsapp" | "social" | "google" | "sokobase" | "direct" | "other";

export const SOURCE_LABELS: Record<Source, string> = {
  whatsapp: "WhatsApp",
  social: "Facebook, Instagram, TikTok, X",
  google: "Google and other search",
  sokobase: "Browsing SokoBase",
  direct: "Direct and chat links",
  other: "Other websites",
};

export function classifySource({ referrer, internal, src }: { referrer?: string; internal?: boolean; src?: string }): Source {
  // Our own share buttons can tag links (?src=whatsapp); trust only known values.
  const tag = (src ?? "").toLowerCase();
  if (tag === "whatsapp" || tag === "wa" || tag === "status") return "whatsapp";
  if (["facebook", "instagram", "tiktok", "social"].includes(tag)) return "social";
  if (internal) return "sokobase";
  let host = "";
  try { host = referrer ? new URL(referrer).hostname.toLowerCase() : ""; } catch { host = ""; }
  if (!host) return "direct"; // typed, bookmarked, or opened from WhatsApp/SMS (apps send no referrer)
  if (/(^|\.)(whatsapp\.com|wa\.me)$/.test(host)) return "whatsapp";
  if (/(^|\.)(facebook\.com|fb\.com|instagram\.com|tiktok\.com|t\.co|twitter\.com|x\.com|linkedin\.com|snapchat\.com|pinterest\.com)$/.test(host)) return "social";
  if (/(^|\.)(google\.[a-z.]+|bing\.com|duckduckgo\.com|yahoo\.com|yandex\.[a-z]+|ecosia\.org)$/.test(host)) return "google";
  if (/(^|\.)sokobase\.co\.ke$/.test(host)) return "sokobase";
  return "other";
}
