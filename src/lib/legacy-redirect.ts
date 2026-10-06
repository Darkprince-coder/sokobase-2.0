import { NextResponse } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";
import { site } from "@/lib/site";

// The previous SokoBase site used /listings/<slug> and /rentals/<slug>, and those URLs are indexed
// by Google. Send each one permanently (301) to the matching product if it exists on the new site,
// otherwise to a search for its name, so visitors and search ranking are not lost.
export async function redirectLegacyListing(slug: string) {
  const clean = slug.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 120);
  if (clean) {
    const { data } = await createPublicClient().from("products").select("slug").eq("slug", clean).eq("status", "published").maybeSingle();
    if (data) return NextResponse.redirect(`${site.url}/products/${data.slug}`, 301);
  }
  // First few words of the old slug make a good search ("3 by 6 mattress"); every word must match, so keep it short.
  const words = clean.split("-").filter(Boolean).slice(0, 4).join(" ");
  return NextResponse.redirect(words ? `${site.url}/products?q=${encodeURIComponent(words)}` : `${site.url}/products`, 301);
}
