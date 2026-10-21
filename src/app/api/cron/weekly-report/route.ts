import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { addDays, change, getInsights, nairobiToday } from "@/lib/insights";
import { emailHtml, sendEmail } from "@/lib/email";
import { site } from "@/lib/site";

// Every Monday 05:00 UTC (08:00 in Nairobi, see vercel.json): emails each live shop last week's
// numbers (Monday to Sunday ending yesterday). Owners can switch it off on the Insights page.
// Also trims page views older than ~13 months. Requires CRON_SECRET like the other cron job.
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const fmt = (n: number) => n.toLocaleString("en-KE");
const short = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString("en-KE", { day: "numeric", month: "short" });

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = createAdminClient();
  const yesterday = addDays(nairobiToday(), -1);

  // Live shops: active, opted in, with a plan that is live (not lapsed or pending).
  const { data: subs } = await db.from("subscriptions").select("business_id").eq("status", "active").gt("ends_at", new Date().toISOString()).limit(5000);
  const liveIds = [...new Set((subs ?? []).map((s) => s.business_id as string))];
  const { data: shops } = liveIds.length
    ? await db.from("businesses").select("id, name, owner_id").in("id", liveIds).eq("status", "active").eq("weekly_report", true)
    : { data: [] as { id: string; name: string; owner_id: string }[] };

  let sent = 0, failed = 0;
  for (const shop of shops ?? []) {
    const { data: owner } = await db.auth.admin.getUserById(shop.owner_id);
    const to = owner.user?.email;
    if (!to) continue;
    const d = await getInsights(shop.id, 7, yesterday);
    const visits = d.now.shopViews + d.now.productViews;
    const before = d.before.shopViews + d.before.productViews;
    const pct = change(visits, before);
    const trend = pct === null || pct === 0 ? "" : ` (${pct > 0 ? "up" : "down"} ${Math.abs(pct)}% on the week before)`;
    const top = d.products.find((p) => p.status === "published" && p.views > 0);
    const paragraphs = visits + d.now.clicks === 0
      ? [
          `Your shop had no visits from ${short(d.from)} to ${short(d.to)}.`,
          "Customers can only find you if they see your link. Post your shop link on your WhatsApp Status and in a few groups this week: it takes a minute and it works.",
        ]
      : [
          `From ${short(d.from)} to ${short(d.to)}, ${shop.name} had ${fmt(visits)} visit${visits === 1 ? "" : "s"}${trend} and ${fmt(d.now.clicks)} WhatsApp order tap${d.now.clicks === 1 ? "" : "s"}.`,
          ...(top ? [`Most viewed: ${top.name} (${fmt(top.views)} views, ${fmt(top.clicks)} order taps).`] : []),
          "Keep sharing your shop link on WhatsApp Status and social media to bring in more customers.",
        ];
    const ok = await sendEmail(to, `Your week on SokoBase: ${fmt(visits)} visits, ${fmt(d.now.clicks)} order taps`, emailHtml({
      heading: "Your week on SokoBase",
      paragraphs: [...paragraphs, "You can turn these weekly emails off on your Insights page."],
      button: { label: "See your insights", href: `${site.portalUrl}/dashboard/insights` },
    }));
    if (ok) sent++; else failed++;
  }

  // Housekeeping: keep about 13 months of page views.
  await db.from("page_views").delete().lt("viewed_on", addDays(nairobiToday(), -400));
  return NextResponse.json({ shops: shops?.length ?? 0, sent, failed });
}
