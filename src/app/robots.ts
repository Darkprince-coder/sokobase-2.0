import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { site } from "@/lib/site";

// Same deployment serves two hostnames: the public marketplace is crawlable, the business portal
// (portal.sokobase.co.ke) is not indexed at all.
export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = ((await headers()).get("host") ?? "").split(":")[0].toLowerCase();
  const portal = process.env.NEXT_PUBLIC_PORTAL_HOST?.toLowerCase();
  if (portal && host === portal) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/offline", "/saved"] }],
    sitemap: `${site.url}/sitemap.xml`,
  };
}
