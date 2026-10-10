import "server-only";

// Transactional email through Resend (the same account Supabase uses for password resets).
// Off until RESEND_API_KEY is set; sending never throws and never blocks the action that calls it.
const FROM = () => process.env.EMAIL_FROM || "SokoBase <hello@sokobase.co.ke>";
export const adminNotifyEmail = () => process.env.ADMIN_NOTIFY_EMAIL || process.env.NEXT_PUBLIC_CONTACT_EMAIL || "";

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** A plain, mobile-friendly email: heading, paragraphs, optional button. Text is escaped. */
export function emailHtml({ heading, paragraphs, button }: { heading: string; paragraphs: string[]; button?: { label: string; href: string } }) {
  return `<!doctype html><html><body style="margin:0;background:#f4f5f4;font-family:Arial,Helvetica,sans-serif;color:#14201b">
<div style="max-width:520px;margin:0 auto;padding:28px 18px">
<div style="font-size:20px;font-weight:700;margin-bottom:18px"><span>Soko</span><span style="color:#1f7a4d">Base</span></div>
<div style="background:#fff;border-radius:14px;padding:24px 22px;border:1px solid #dce6de">
<h1 style="font-size:20px;margin:0 0 12px">${escape(heading)}</h1>
${paragraphs.map((p) => `<p style="font-size:15px;line-height:1.55;margin:0 0 12px;color:#3a4a42">${escape(p)}</p>`).join("")}
${button ? `<a href="${escape(button.href)}" style="display:inline-block;margin-top:8px;background:#1f7a4d;color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:999px">${escape(button.label)}</a>` : ""}
</div>
<p style="font-size:12px;color:#7a877f;margin-top:16px">SokoBase: shop verified businesses across Kenya and order on WhatsApp.</p>
</div></body></html>`;
}

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key || !to) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM(), to: [to], subject, html }),
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}
