-- SokoBase 0002: Row Level Security + explicit Data API grants.
-- Supabase no longer exposes new public tables automatically, so every role gets only the
-- privileges listed here. Anything not granted is unreachable from the browser.

alter table public.profiles enable row level security;
alter table public.plans enable row level security;
alter table public.categories enable row level security;
alter table public.businesses enable row level security;
alter table public.subscriptions enable row level security;
alter table public.invites enable row level security;
alter table public.products enable row level security;
alter table public.order_clicks enable row level security;
alter table public.platform_settings enable row level security;

-- Helper functions (security definer so policies do not recurse)
create function public.owns_business(bid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.businesses b where b.id = bid and b.owner_id = (select auth.uid()));
$$;

-- True only while the business is active AND has a live subscription. Gates all product writes.
create function public.business_can_write(bid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.businesses b
    join public.subscriptions s on s.business_id = b.id
    where b.id = bid
      and b.owner_id = (select auth.uid())
      and b.status = 'active'
      and s.status = 'active'
      and s.starts_at <= now()
      and s.ends_at > now()
  );
$$;

revoke all on function public.owns_business(uuid) from public, anon;
revoke all on function public.business_can_write(uuid) from public, anon;
grant execute on function public.owns_business(uuid) to authenticated;
grant execute on function public.business_can_write(uuid) to authenticated;

-- ---------- Grants ----------
-- Server-side admin client (service_role): full access. Never used in the browser.
grant select, insert, update, delete on
  public.profiles, public.plans, public.categories, public.businesses, public.subscriptions,
  public.invites, public.products, public.order_clicks, public.platform_settings
to service_role;

-- Public catalogue data
grant select on public.categories, public.plans, public.platform_settings to anon, authenticated;
-- Anonymous visitors never see owner_id
grant select (id, slug, name, description, logo_url, cover_url, category_id, location, whatsapp, status, created_at)
  on public.businesses to anon;
grant select on public.businesses to authenticated;
grant update (name, description, logo_url, cover_url, category_id, location, whatsapp)
  on public.businesses to authenticated;

grant select on public.products to anon, authenticated;
grant insert (business_id, category_id, name, slug, description, price, old_price, price_type, badge, images, in_stock, status)
  on public.products to authenticated;
grant update (category_id, name, slug, description, price, old_price, price_type, badge, images, in_stock, status)
  on public.products to authenticated;
grant delete on public.products to authenticated;

grant select on public.subscriptions to authenticated;
grant select on public.profiles to authenticated;
-- invites and order_clicks: no grants to anon/authenticated (service_role only).

-- ---------- Policies ----------
create policy categories_read on public.categories for select to anon, authenticated using (active);
create policy plans_read on public.plans for select to anon, authenticated using (active);
create policy settings_read on public.platform_settings for select to anon, authenticated using (true);

create policy profiles_self_read on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy businesses_public_read on public.businesses for select to anon
  using (status = 'active');
create policy businesses_auth_read on public.businesses for select to authenticated
  using (status = 'active' or owner_id = (select auth.uid()));
create policy businesses_owner_update on public.businesses for update to authenticated
  using (owner_id = (select auth.uid()) and status = 'active')
  with check (owner_id = (select auth.uid()));

create policy subscriptions_owner_read on public.subscriptions for select to authenticated
  using (public.owns_business(business_id));

create policy products_public_read on public.products for select to anon, authenticated
  using (status = 'published' and exists (select 1 from public.businesses b where b.id = products.business_id));
create policy products_owner_read on public.products for select to authenticated
  using (public.owns_business(business_id));
create policy products_owner_insert on public.products for insert to authenticated
  with check (public.business_can_write(business_id));
create policy products_owner_update on public.products for update to authenticated
  using (public.owns_business(business_id))
  with check (public.business_can_write(business_id));
create policy products_owner_delete on public.products for delete to authenticated
  using (public.business_can_write(business_id));
