import { redirectLegacyListing } from "@/lib/legacy-redirect";

// Old site rental URLs (/rentals/<slug>), see lib/legacy-redirect.ts.
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  return redirectLegacyListing((await params).slug);
}
