// Database security check: tries what an attacker could attempt with the public (anon) key, and
// optionally as a signed-in business owner, and reports anything that is NOT refused.
//
//   npm run check:security                       anonymous checks
//   TEST_OWNER_EMAIL=... [TEST_OWNER_PASSWORD=...] npm run check:security
//                                                 + checks as a business owner (use a test shop)
//
// Safe to run against real data: every write it attempts either must be refused, or writes a row's
// existing values back unchanged, so nothing changes even if a check fails. Run after each migration.
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !anonKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (run via npm run check:security).");
  process.exit(2);
}

const results = [];
const record = (name, ok, detail = "") => results.push({ name, ok, detail });
const FAKE_ID = "00000000-0000-0000-0000-000000000000";

// Explicitly refused by permissions (not merely failing for another reason such as a missing row).
const denied = ({ error }) => !!error && (error.code === "42501" || /permission denied|row-level security/i.test(error.message));
// Refused, or silently matched nothing (RLS hides rows from reads/updates instead of erroring).
const blocked = (r) => denied(r) || (!r.error && (Array.isArray(r.data) ? r.data.length === 0 : r.data == null));
const why = (r, fallback) => r.error ? `${r.error.code ?? ""} ${r.error.message}`.trim() : fallback;

async function anonymousChecks() {
  const db = createClient(url, anonKey, { auth: { persistSession: false } });

  const settings = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: anonKey } }).then((r) => r.json()).catch(() => null);
  record("Public sign-ups are disabled", settings?.disable_signup === true, settings ? `disable_signup=${settings.disable_signup}` : "could not read auth settings");

  const ownerCol = await db.from("businesses").select("owner_id").limit(1);
  record("Visitors cannot read shop owner ids", denied(ownerCol), why(ownerCol, "owner_id was readable"));

  const requested = await db.from("businesses").select("requested_plan_id").limit(1);
  record("Visitors cannot read a shop's requested plan", denied(requested), why(requested, "requested_plan_id was readable"));

  for (const table of ["invites", "order_clicks", "reports", "admin_audit_log", "profiles", "subscriptions", "signup_attempts"]) {
    const r = await db.from(table).select("*").limit(1);
    record(`Visitors cannot read ${table}`, blocked(r), why(r, `${r.data?.length ?? 0} row(s) returned`));
  }

  const drafts = await db.from("products").select("id").eq("status", "draft").limit(1);
  record("Visitors cannot see draft products", blocked(drafts), why(drafts, `${drafts.data?.length} draft(s) visible`));

  const ins = await db.from("products").insert({ business_id: FAKE_ID, name: "x", slug: "security-check-x", price_type: "contact" }).select();
  record("Visitors cannot create products", denied(ins), why(ins, "insert succeeded"));

  const { data: plan } = await db.from("plans").select("id, price_kes").limit(1).maybeSingle();
  if (plan) {
    const r = await db.from("plans").update({ price_kes: plan.price_kes }).eq("id", plan.id).select();
    record("Visitors cannot change plan prices", blocked(r), why(r, "plan update succeeded"));
  }

  const { data: shop } = await db.from("businesses").select("id, name").limit(1).maybeSingle();
  if (shop) {
    const r = await db.from("businesses").update({ name: shop.name }).eq("id", shop.id).select("id");
    record("Visitors cannot edit shops", blocked(r), why(r, "shop update succeeded"));
  }

  for (const [fn, args] of [
    ["save_product", { p_id: null, p_business_id: FAKE_ID, p_slug: "x", p_fields: {}, p_variants: [] }],
    ["set_business_categories", { p_business_id: FAKE_ID, p_category_ids: [FAKE_ID] }],
    ["my_business_id", {}],
  ]) {
    const r = await db.rpc(fn, args);
    record(`Visitors cannot call ${fn}()`, denied(r), why(r, "call succeeded"));
  }
}

async function ownerChecks(email, password) {
  const db = createClient(url, anonKey, { auth: { persistSession: false } });
  // With a password: normal sign-in. Without one (local only): a one-time sign-in link made with the
  // service key, the same mechanism as a password-reset email.
  let auth, error;
  if (password) ({ data: auth, error } = await db.auth.signInWithPassword({ email, password }));
  else {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const link = await fetch(`${url}/auth/v1/admin/generate_link`, {
      method: "POST", headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ type: "magiclink", email }),
    }).then((r) => r.json()).catch(() => ({}));
    const hash = link.hashed_token ?? link.properties?.hashed_token;
    ({ data: auth, error } = hash ? await db.auth.verifyOtp({ type: "magiclink", token_hash: hash }) : { data: {}, error: { message: "could not create sign-in link" } });
  }
  if (error || !auth.user) return record("Sign in as test owner", false, error?.message ?? "no user");
  record("Sign in as test owner", true);

  const { data: myId } = await db.rpc("my_business_id");
  record("Owner can find their own shop", !!myId, myId ? "" : "my_business_id() returned nothing");

  const ownerCol = await db.from("businesses").select("owner_id").limit(1);
  record("Owners cannot read any shop's owner_id", denied(ownerCol), why(ownerCol, "owner_id was readable"));

  const { data: other } = await db.from("businesses").select("id, name").neq("id", myId ?? FAKE_ID).limit(1).maybeSingle();
  if (other) {
    const r = await db.from("businesses").update({ name: other.name }).eq("id", other.id).select("id");
    record("Owners cannot edit other shops", blocked(r), why(r, "another shop was updated"));

    const p = await db.from("products").insert({ business_id: other.id, name: "Security check", slug: `security-check-${Date.now()}`, price_type: "contact", status: "draft" }).select("id");
    record("Owners cannot add products to another shop", denied(p), why(p, "insert succeeded"));
    if (p.data?.[0]?.id) await db.from("products").delete().eq("id", p.data[0].id); // undo, if it ever got through
  } else {
    record("Owners cannot edit other shops", true, "skipped: no other public shop to test against");
  }

  if (myId) {
    const { data: mine } = await db.from("businesses").select("slug, status, verified_at").eq("id", myId).single();
    const slugStatus = await db.from("businesses").update({ slug: mine.slug, status: mine.status }).eq("id", myId).select("id");
    record("Owners cannot change their own slug or status", denied(slugStatus), why(slugStatus, "slug/status were writable"));
    const verified = await db.from("businesses").update({ verified_at: mine.verified_at }).eq("id", myId).select("id");
    record("Owners cannot verify themselves", denied(verified), why(verified, "verified_at was writable"));

    const sub = await db.from("subscriptions").insert({ business_id: myId, plan_id: FAKE_ID, ends_at: new Date(Date.now() + 864e5).toISOString() }).select();
    record("Owners cannot extend their own subscription", denied(sub), why(sub, "insert succeeded"));
  }

  const otherSubs = await db.from("subscriptions").select("business_id").neq("business_id", myId ?? FAKE_ID).limit(1);
  record("Owners cannot see other shops' subscriptions", blocked(otherSubs), why(otherSubs, `${otherSubs.data?.length} visible`));

  const { data: me } = await db.from("profiles").select("role").eq("id", auth.user.id).single();
  const role = await db.from("profiles").update({ role: me?.role ?? "business_owner" }).eq("id", auth.user.id).select();
  record("Owners cannot change their role", blocked(role), why(role, "role was writable"));

  for (const table of ["invites", "order_clicks", "reports", "admin_audit_log"]) {
    const r = await db.from(table).select("*").limit(1);
    record(`Owners cannot read ${table}`, blocked(r), why(r, `${r.data?.length ?? 0} row(s)`));
  }
  await db.auth.signOut();
}

await anonymousChecks();
if (process.env.TEST_OWNER_EMAIL && (process.env.TEST_OWNER_PASSWORD || process.env.SUPABASE_SERVICE_ROLE_KEY)) await ownerChecks(process.env.TEST_OWNER_EMAIL, process.env.TEST_OWNER_PASSWORD);
else console.log("(Set TEST_OWNER_EMAIL and TEST_OWNER_PASSWORD to also run the business-owner checks.)\n");

let failed = 0;
for (const r of results) {
  if (!r.ok) failed++;
  console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${!r.ok && r.detail ? `  -> ${r.detail}` : ""}`);
}
console.log(`\n${results.length - failed}/${results.length} checks passed.`);
process.exit(failed ? 1 : 0);
