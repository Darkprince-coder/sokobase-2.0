import "server-only";

// Public tracking endpoints (order clicks, page views) only accept requests made by our own pages.
const allowedHosts = [process.env.NEXT_PUBLIC_SITE_HOST, process.env.NEXT_PUBLIC_PORTAL_HOST].filter(Boolean) as string[];

export function sameSite(req: Request) {
  const fetchSite = req.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "same-site") return false;
  const origin = req.headers.get("origin");
  if (!origin) return fetchSite != null; // browsers send at least one of these on a POST
  try {
    const host = new URL(origin).hostname;
    if (process.env.NODE_ENV !== "production") return true;
    return allowedHosts.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}
