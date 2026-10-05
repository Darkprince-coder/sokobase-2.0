-- SokoBase 0001: tables, constraints, triggers.
-- Run in Supabase > SQL Editor. Then run 0002 and 0003.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'business_owner' check (role in ('super_admin', 'business_owner')),
  full_name text,
  created_at timestamptz not null default now()
);

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  product_limit integer check (product_limit is null or product_limit > 0), -- null = unlimited
  price_kes integer not null default 0 check (price_kes >= 0),
  duration_days integer not null default 30 check (duration_days > 0),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  icon text, -- lucide icon name
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users (id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 40),
  name text not null check (char_length(name) between 2 and 80),
  description text check (char_length(description) <= 1000),
  logo_url text,
  cover_url text,
  category_id uuid references public.categories (id) on delete set null,
  location text not null check (char_length(location) between 2 and 80),
  whatsapp text not null check (whatsapp ~ '^254[17][0-9]{8}$'), -- 2547XXXXXXXX or 2541XXXXXXXX
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Expiry is derived: a subscription is live while status = 'active' and now() < ends_at.
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  plan_id uuid not null references public.plans (id),
  status text not null default 'active' check (status in ('active', 'cancelled')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  payment_note text, -- e.g. M-Pesa transaction code
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index subscriptions_business_idx on public.subscriptions (business_id, ends_at desc);

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9]{4}-[A-Z0-9]{4}$'),
  plan_id uuid not null references public.plans (id),
  duration_days integer not null default 30 check (duration_days > 0),
  note text, -- who it was issued to
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_at timestamptz,
  business_id uuid references public.businesses (id) on delete set null,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  name text not null check (char_length(name) between 2 and 120),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text check (char_length(description) <= 4000),
  price numeric(12, 2) check (price >= 0),
  old_price numeric(12, 2) check (old_price is null or old_price > 0),
  price_type text not null default 'fixed' check (price_type in ('fixed', 'from', 'contact')),
  badge text check (badge in ('hot', 'offer', 'new')),
  images text[] not null default '{}' check (cardinality(images) <= 8),
  in_stock boolean not null default true,
  status text not null default 'published' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, slug),
  check (price_type = 'contact' or price is not null),
  check (old_price is null or price is null or old_price > price)
);
create index products_business_idx on public.products (business_id);
create index products_category_idx on public.products (category_id);
create index products_feed_idx on public.products (status, created_at desc);

-- One row per tap on "Order on WhatsApp". Written by the server only.
create table public.order_clicks (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products (id) on delete set null,
  business_id uuid not null references public.businesses (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index order_clicks_business_idx on public.order_clicks (business_id, created_at desc);

create table public.platform_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- Triggers
create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger businesses_updated before update on public.businesses
  for each row execute function public.set_updated_at();
create trigger products_updated before update on public.products
  for each row execute function public.set_updated_at();
create trigger settings_updated before update on public.platform_settings
  for each row execute function public.set_updated_at();

-- Enforces the plan's product limit in the database, so it cannot be bypassed from the browser.
create function public.enforce_product_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  lim integer;
  cnt integer;
begin
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

create trigger products_limit before insert on public.products
  for each row execute function public.enforce_product_limit();

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.enforce_product_limit() from public, anon, authenticated;
