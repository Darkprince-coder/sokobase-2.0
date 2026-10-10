// Human-readable labels for the admin area.

export const REPORT_REASONS = {
  scam: "Possible scam or fraud",
  wrong_info: "Wrong price, photos or details",
  prohibited: "Illegal or prohibited item",
  unreachable: "Seller not responding",
  other: "Other",
} as const;

const ACTIONS: Record<string, string> = {
  "invite.create": "Created an invite",
  "invite.revoke": "Revoked an invite",
  "business.suspend": "Suspended the shop",
  "business.activate": "Reactivated the shop",
  "business.verify": "Marked the shop as verified",
  "business.unverify": "Removed the verified badge",
  "subscription.renew": "Recorded a subscription payment",
  "subscription.cancel": "Cancelled a subscription period",
  "subscription.set_end": "Changed a subscription end date",
  "owner.password_reset": "Reset the owner password",
  "product.unpublish": "Unpublished a product",
  "product.republish": "Republished a product",
  "plan.update": "Updated a plan",
  "category.create": "Added a category",
  "category.update": "Updated a category",
  "subcategory.create": "Added a subcategory",
  "subcategory.update": "Updated a subcategory",
  "subcategory.delete": "Deleted a subcategory",
  "hero.update": "Updated the home page slides",
  "product.feature": "Featured a product on the home page",
  "product.unfeature": "Removed a product from the home page",
  "business.feature": "Featured the shop on the home page",
  "business.unfeature": "Removed the shop from the home page",
  "business.delete": "Deleted the shop permanently",
  "business.approve": "Approved a new sign-up",
  "business.reject": "Rejected a new sign-up",
  "business.auto_remove": "Removed an abandoned sign-up automatically",
  "report.resolved": "Resolved a report",
  "report.dismissed": "Dismissed a report",
  "report.open": "Reopened a report",
};

const kes = (n: unknown) => (typeof n === "number" ? `KSh ${n.toLocaleString("en-KE")}` : null);
const day = (iso: unknown) => (typeof iso === "string" ? new Date(iso).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }) : null);

export function describeAudit(action: string, details: Record<string, unknown> = {}) {
  const base = ACTIONS[action] ?? action;
  const extra = [
    action === "subscription.renew" && [kes(details.amount_kes), details.duration_days ? `${details.duration_days} days` : null, details.payment_note].filter(Boolean).join(", "),
    action === "subscription.set_end" && day(details.to) && `to ${day(details.to)}`,
    action === "invite.create" && typeof details.note === "string" && details.note,
    (action === "business.delete" || action === "business.reject") && typeof details.name === "string" && `${details.name}, ${details.products ?? 0} products`,
    action === "business.approve" && typeof details.name === "string" && [details.name, details.amount_kes === 0 ? "free trial" : kes(details.amount_kes), details.duration_days ? `${details.duration_days} days` : null].filter(Boolean).join(", "),
    action === "business.auto_remove" && typeof details.name === "string" && details.name,
    (action === "invite.create" || action === "invite.revoke") && typeof details.code === "string" && details.code,
    action === "plan.update" && typeof details.name === "string" && details.name,
    (action.startsWith("category") || action.startsWith("subcategory")) && typeof details.name === "string" && details.name,
  ].filter(Boolean).join(" · ");
  return extra ? `${base} (${extra})` : base;
}
