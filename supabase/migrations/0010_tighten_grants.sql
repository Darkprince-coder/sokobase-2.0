-- SokoBase 0010: make the column-level grants actually take effect.
--
-- Supabase's default privileges give the anon and authenticated roles ALL privileges on every new
-- table in the public schema. Earlier migrations added column-level grants (e.g. visitors may read
-- a shop's name but not its owner_id; owners may edit their description but not their slug,
-- status or verified badge) but never removed those table-wide defaults, so the column rules had
-- no effect. Row Level Security still protected other people's rows; this closes the column gap.
--
-- After this migration, this file is the single source of truth for what the browser can touch.
-- Found by scripts/check-security.mjs (npm run check:security).

begin;

-- 1. Remove every table/sequence privilege the browser roles have, and stop new tables, sequences
--    and functions being exposed automatically in future.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from anon, authenticated, public;

-- 2. Public catalogue: readable by everyone (RLS policies decide which rows).
grant select on public.categories, public.subcategories, public.counties, public.plans, public.platform_settings,
  public.products, public.product_variants, public.business_categories
  to anon, authenticated;

-- Shops: public columns only. owner_id is never readable from the browser.
grant select (id, slug, name, description, logo_url, cover_url, county_id, location, whatsapp, status, verified_at, created_at, updated_at)
  on public.businesses to anon, authenticated;

-- 3. Business owners (RLS restricts every write to their own shop while it is active and paid).
grant update (name, description, logo_url, cover_url, county_id, location, whatsapp) on public.businesses to authenticated;

grant insert (business_id, category_id, subcategory_id, name, slug, description, price, old_price, price_type, badge, images, in_stock, status, specs)
  on public.products to authenticated;
grant update (category_id, subcategory_id, name, description, price, old_price, price_type, badge, images, in_stock, status, specs)
  on public.products to authenticated;
grant delete on public.products to authenticated;

grant insert (product_id, label, price, old_price, in_stock, sort_order) on public.product_variants to authenticated;
grant update (label, price, old_price, in_stock, sort_order) on public.product_variants to authenticated;
grant delete on public.product_variants to authenticated;

grant insert, delete on public.business_categories to authenticated;

-- Own subscription history and own profile (RLS: only their own rows).
grant select on public.subscriptions, public.profiles to authenticated;

-- 4. Never reachable from the browser (server/service role only):
--    invites, order_clicks, reports, admin_audit_log, and all writes to plans, categories,
--    subcategories, counties, platform_settings, subscriptions and profiles.

commit;
