-- SokoBase 0007: security hardening.
--   1. Public visibility: a shop (and its products) is public only while active AND its subscription
--      is live or ended less than 7 days ago (grace period).
--   2. Signed-in owners can no longer read other shops' private columns (owner_id).
--   3. Category writes require an active shop.
--   4. Plan/category limits are race-safe (advisory lock per business).
--   5. Product + variants and the category set each save atomically through RPCs.
--   6. Admin audit log.
--   7. order_clicks gets a fingerprint column for de-duplication.

-- ---------- 1. Public visibility with a 7-day grace period ----------
create or replace function public.business_is_public(bid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.businesses b
    where b.id = bid
      and b.status = 'active'
      and exists (
        select 1 from public.subscriptions s
        where s.business_id = b.id
          and s.status = 'active'
          and s.starts_at <= now()
          and s.ends_at > now() - interval '7 days'
      )
  );
$$;
revoke all on function public.business_is_public(uuid) from public;
grant execute on function public.business_is_public(uuid) to anon, authenticated, service_role;

drop policy if exists businesses_public_read on public.businesses;
create policy businesses_public_read on public.businesses for select to anon
  using (public.business_is_public(id));

drop policy if exists businesses_auth_read on public.businesses;
create policy businesses_auth_read on public.businesses for select to authenticated
  using (public.business_is_public(id) or owner_id = (select auth.uid()));

drop policy if exists products_public_read on public.products;
create policy products_public_read on public.products for select to anon, authenticated
  using (status = 'published' and public.business_is_public(business_id));

drop policy if exists variants_public_read on public.product_variants;
create policy variants_public_read on public.product_variants for select to anon, authenticated
  using (exists (
    select 1 from public.products p
    where p.id = product_variants.product_id and p.status = 'published' and public.business_is_public(p.business_id)
  ));

drop policy if exists bizcat_public_read on public.business_categories;
create policy bizcat_public_read on public.business_categories for select to anon, authenticated
  using (public.business_is_public(business_id));

-- Lets the store page tell "this shop is paused" apart from "no such shop" without exposing the row.
create or replace function public.shop_status(p_slug text) returns text
language sql stable security definer set search_path = '' as $$
  select case
    when b.id is null then 'missing'
    when public.business_is_public(b.id) then 'public'
    else 'unavailable'
  end
  from (select 1) one
  left join public.businesses b on b.slug = p_slug;
$$;
revoke all on function public.shop_status(text) from public;
grant execute on function public.shop_status(text) to anon, authenticated, service_role;

-- ---------- 2. Column-level reads for signed-in users ----------
-- Before: authenticated could SELECT every column (incl. owner_id) of every public shop.
revoke select on public.businesses from authenticated;
grant select (id, slug, name, description, logo_url, cover_url, county_id, location, whatsapp, status, created_at, updated_at)
  on public.businesses to authenticated;
grant select (updated_at) on public.businesses to anon;

-- The dashboard finds "my shop" through this instead of filtering on owner_id.
create or replace function public.my_business_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select b.id from public.businesses b where b.owner_id = (select auth.uid()) limit 1;
$$;
revoke all on function public.my_business_id() from public, anon;
grant execute on function public.my_business_id() to authenticated;

-- ---------- 3. Category writes require an active shop ----------
create or replace function public.owns_active_business(bid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.businesses b where b.id = bid and b.owner_id = (select auth.uid()) and b.status = 'active');
$$;
revoke all on function public.owns_active_business(uuid) from public, anon;
grant execute on function public.owns_active_business(uuid) to authenticated;

drop policy if exists bizcat_owner_insert on public.business_categories;
create policy bizcat_owner_insert on public.business_categories for insert to authenticated
  with check (public.owns_active_business(business_id));
drop policy if exists bizcat_owner_delete on public.business_categories;
create policy bizcat_owner_delete on public.business_categories for delete to authenticated
  using (public.owns_active_business(business_id));

-- ---------- 4. Race-safe limits ----------
-- Two simultaneous inserts could both count N-1 and both pass. A per-business transaction lock
-- serialises them so the count is always accurate.
create or replace function public.enforce_product_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  lim integer;
  cnt integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('product_limit:' || new.business_id::text, 0));

  select p.product_limit into lim
  from public.subscriptions s
  join public.plans p on p.id = s.plan_id
  where s.business_id = new.business_id and s.status = 'active' and s.ends_at > now()
  order by s.ends_at desc limit 1;

  if lim is null then
    return new; -- unlimited plan (no live plan is blocked by the write policy)
  end if;

  select count(*) into cnt from public.products where business_id = new.business_id;
  if cnt >= lim then
    raise exception 'Product limit reached for your plan (% products).', lim using errcode = 'P0001';
  end if;
  return new;
end $$;

create or replace function public.enforce_category_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare cnt integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('category_limit:' || new.business_id::text, 0));
  select count(*) into cnt from public.business_categories where business_id = new.business_id;
  if cnt >= 3 then
    raise exception 'You can select up to 3 categories.' using errcode = 'P0001';
  end if;
  return new;
end $$;
revoke all on function public.enforce_product_limit() from public, anon, authenticated;
revoke all on function public.enforce_category_limit() from public, anon, authenticated;

-- ---------- 5. Atomic saves (security invoker: RLS, grants and triggers still apply) ----------
-- Saves a product and replaces its variants in one transaction. Returns {"id", "slug"}.
create or replace function public.save_product(p_id uuid, p_business_id uuid, p_slug text, p_fields jsonb, p_variants jsonb)
returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  v_id uuid;
  v_slug text;
  v_images text[] := coalesce(array(select jsonb_array_elements_text(coalesce(p_fields->'images', '[]'::jsonb))), '{}');
begin
  if p_id is null then
    insert into public.products (business_id, slug, category_id, subcategory_id, name, description, price, old_price,
                                 price_type, badge, images, in_stock, status, specs)
    values (p_business_id, p_slug, (p_fields->>'category_id')::uuid, (p_fields->>'subcategory_id')::uuid, p_fields->>'name',
            p_fields->>'description', (p_fields->>'price')::numeric, (p_fields->>'old_price')::numeric,
            p_fields->>'price_type', p_fields->>'badge', v_images, coalesce((p_fields->>'in_stock')::boolean, true),
            coalesce(p_fields->>'status', 'published'), coalesce(p_fields->'specs', '{}'::jsonb))
    returning id, slug into v_id, v_slug;
  else
    update public.products set
      category_id = (p_fields->>'category_id')::uuid,
      subcategory_id = (p_fields->>'subcategory_id')::uuid,
      name = p_fields->>'name',
      description = p_fields->>'description',
      price = (p_fields->>'price')::numeric,
      old_price = (p_fields->>'old_price')::numeric,
      price_type = p_fields->>'price_type',
      badge = p_fields->>'badge',
      images = v_images,
      in_stock = coalesce((p_fields->>'in_stock')::boolean, true),
      status = coalesce(p_fields->>'status', 'published'),
      specs = coalesce(p_fields->'specs', '{}'::jsonb)
    where id = p_id and business_id = p_business_id
    returning id, slug into v_id, v_slug;
    if v_id is null then
      raise exception 'Product not found.' using errcode = 'P0002';
    end if;
  end if;

  delete from public.product_variants where product_id = v_id;
  insert into public.product_variants (product_id, label, price, old_price, in_stock, sort_order)
  select v_id, x.label, x.price, x.old_price, coalesce(x.in_stock, true), coalesce(x.sort_order, 0)
  from jsonb_to_recordset(coalesce(p_variants, '[]'::jsonb))
    as x(label text, price numeric, old_price numeric, in_stock boolean, sort_order integer);

  return jsonb_build_object('id', v_id, 'slug', v_slug);
end $$;
revoke all on function public.save_product(uuid, uuid, text, jsonb, jsonb) from public, anon;
grant execute on function public.save_product(uuid, uuid, text, jsonb, jsonb) to authenticated;

-- Replaces a shop's category set (1 to 3) in one transaction.
create or replace function public.set_business_categories(p_business_id uuid, p_category_ids uuid[])
returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if coalesce(cardinality(p_category_ids), 0) not between 1 and 3 then
    raise exception 'Choose 1 to 3 categories.' using errcode = 'P0001';
  end if;
  delete from public.business_categories where business_id = p_business_id;
  insert into public.business_categories (business_id, category_id)
  select p_business_id, c from (select distinct unnest(p_category_ids) as c) d;
end $$;
revoke all on function public.set_business_categories(uuid, uuid[]) from public, anon;
grant execute on function public.set_business_categories(uuid, uuid[]) to authenticated;

-- ---------- 6. Admin audit log (server/service role only) ----------
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users (id) on delete set null,
  action text not null check (char_length(action) between 2 and 60),
  target_type text,
  target_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_log_created_idx on public.admin_audit_log (created_at desc);
create index if not exists admin_audit_log_target_idx on public.admin_audit_log (target_id, created_at desc);
alter table public.admin_audit_log enable row level security;
grant select, insert on public.admin_audit_log to service_role;
-- No anon/authenticated grants or policies: unreachable from the browser.

-- ---------- 7. order_clicks de-duplication ----------
alter table public.order_clicks add column if not exists fingerprint text;
create index if not exists order_clicks_dedupe_idx on public.order_clicks (fingerprint, product_id, created_at desc);
