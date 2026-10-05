import { whatsappLink } from "./site";
import { formatDate, isPast } from "./dates";

// Prefilled WhatsApp renewal reminder the admin sends to a shop owner with one tap.
export function renewalReminderLink(opts: { whatsapp: string; shopName: string; planName?: string | null; priceKes?: number | null; endsAt: string }) {
  const plan = opts.planName ? `${opts.planName} plan` : "plan";
  const when = isPast(opts.endsAt) ? `ended on ${formatDate(opts.endsAt)}` : `ends on ${formatDate(opts.endsAt)}`;
  const price = opts.priceKes ? ` The renewal is KSh ${opts.priceKes.toLocaleString("en-KE")}.` : "";
  const text = `Hi ${opts.shopName}, this is SokoBase. Your ${plan} ${when}.${price} To keep your shop online, pay via M-Pesa and reply here with the transaction code. Thank you!`;
  return whatsappLink(opts.whatsapp, text);
}
