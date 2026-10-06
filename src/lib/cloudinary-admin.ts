import "server-only";

// Deleting images from Cloudinary (frees storage when a shop is removed). Uses the API key and
// secret, so it only ever runs on the server, after an admin check.
const cloud = () => process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "";
const auth = () => "Basic " + Buffer.from(`${process.env.CLOUDINARY_API_KEY}:${process.env.CLOUDINARY_API_SECRET}`).toString("base64");
const configured = () => !!(cloud() && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

// https://res.cloudinary.com/<cloud>/image/upload/[transforms/][v123/]folder/name.jpg -> folder/name
export function publicIdFromUrl(url: string, cloudName = cloud()): string | null {
  const m = url.match(/^https:\/\/res\.cloudinary\.com\/([^/]+)\/image\/upload\/(.+)$/);
  if (!m || m[1] !== cloudName) return null;
  let parts = m[2].split("/");
  // Stored URLs carry a version ("v1712345678"): the public id is everything after it.
  const v = parts.findIndex((p) => /^v\d+$/.test(p));
  if (v >= 0) parts = parts.slice(v + 1);
  // Without a version, drop leading transformation segments such as "c_fill,w_400".
  else while (parts.length > 1 && /^(?:[a-z]{1,3}_[^,/]+)(?:,[a-z]{1,3}_[^,/]+)*$/.test(parts[0])) parts.shift();
  const id = parts.join("/").replace(/\.[a-z0-9]+$/i, "");
  return id || null;
}

// Best effort: returns how many images Cloudinary reported deleted; never throws.
export async function deleteImages(urls: string[]): Promise<number> {
  if (!configured()) return 0;
  const ids = [...new Set(urls.map((u) => publicIdFromUrl(u)).filter((x): x is string => !!x))];
  let deleted = 0;
  for (let i = 0; i < ids.length; i += 100) {
    const qs = ids.slice(i, i + 100).map((id) => `public_ids[]=${encodeURIComponent(id)}`).join("&");
    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud()}/resources/image/upload?${qs}`, { method: "DELETE", headers: { Authorization: auth() } });
      const json = (await res.json()) as { deleted?: Record<string, string> };
      deleted += Object.values(json.deleted ?? {}).filter((v) => v === "deleted").length;
    } catch {
      // Storage cleanup must never block deleting the shop itself.
    }
  }
  return deleted;
}

// Removes everything under a folder (signed uploads put each shop in sokobase/shops/<id>/).
export async function deleteFolderImages(prefix: string): Promise<void> {
  if (!configured() || !prefix.startsWith("sokobase/")) return;
  try {
    await fetch(`https://api.cloudinary.com/v1_1/${cloud()}/resources/image/upload?prefix=${encodeURIComponent(prefix)}`, { method: "DELETE", headers: { Authorization: auth() } });
  } catch {
    // best effort
  }
}
