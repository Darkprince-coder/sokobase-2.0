import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AuthCard from "@/components/AuthCard";
import RegisterForm from "@/components/RegisterForm";
import Button from "@/components/Button";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth";
import { site, whatsappLink } from "@/lib/site";
import { isPast } from "@/lib/dates";
import styles from "@/components/AuthCard.module.css";
import { portalAppMetadata, portalViewport } from "@/lib/portal-app";

export const metadata: Metadata = { ...portalAppMetadata, title: "Set up your shop", robots: { index: false, follow: false } };
export const viewport = portalViewport;

const CODE_RE = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/;

function InvalidInvite({ text }: { text: string }) {
  const wa = site.supportWhatsapp ? whatsappLink(site.supportWhatsapp, "Hi SokoBase, my invite link isn't working.") : undefined;
  return (
    <AuthCard title="This link isn't valid" text={text}>
      {wa && <Button href={wa} external size="lg" fullWidth>Message SokoBase on WhatsApp</Button>}
    </AuthCard>
  );
}

export default async function JoinPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { user } = await getSessionUser();
  if (user) redirect("/dashboard");

  const code = (((await searchParams).code ?? "").toUpperCase().trim());
  if (!code) return <InvalidInvite text="You need an invite link from SokoBase to set up a shop. Message us on WhatsApp to get started." />;
  if (!CODE_RE.test(code)) return <InvalidInvite text="This invite link looks incorrect. Check the link SokoBase sent you, or ask for a new one." />;

  const db = createAdminClient();
  const { data: invite } = await db.from("invites").select("used_at, expires_at, plan_id, plans(name)").eq("code", code).maybeSingle();
  if (!invite) return <InvalidInvite text="We couldn't find this invite. Ask SokoBase for a new link." />;
  if (invite.used_at) return <InvalidInvite text="This invite has already been used. Ask SokoBase for a new one if you need another shop." />;
  if (isPast(invite.expires_at)) return <InvalidInvite text="This invite link has expired. Ask SokoBase for a new one." />;

  const [{ data: categories }, { data: counties }] = await Promise.all([
    db.from("categories").select("id, name").eq("active", true).order("sort_order"),
    db.from("counties").select("id, name").order("sort_order"),
  ]);
  const plan = Array.isArray(invite.plans) ? invite.plans[0] : invite.plans;

  return (
    <AuthCard title="Set up your shop" text={plan ? `You're joining on the ${plan.name} plan. This takes about two minutes.` : "This takes about two minutes."}>
      <p className={styles.meta} style={{ marginBottom: -4 }}>Everything except the logo is required.</p>
      <RegisterForm code={code} categories={categories ?? []} counties={counties ?? []} />
    </AuthCard>
  );
}
