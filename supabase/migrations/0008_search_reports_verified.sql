-- SokoBase 0008: real search, listing reports, verified shops.

-- ---------- Search ----------
-- Full-text search (word stems, ranking) + trigram similarity (typo tolerance: "samsng" finds "Samsung").
create extension if not exists pg_trgm with schema extensions;

alter table public.products add column if not exists search tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'C')
  ) stored;
create index if not exists products_search_idx on public.products using gin (search);
create index if not exists products_name_trgm_idx on public.products using gin (name extensions.gin_trgm_ops);
create index if not exists businesses_name_trgm_idx on public.businesses using gin (name extensions.gin_trgm_ops);
create index if not exists products_price_idx on public.products (status, price);

-- Returns matching product ids in display order, plus the total match count (for "Load more").
-- security invoker: the caller's RLS applies, so anonymous visitors only ever see public products.
create or replace function public.search_products(
  p_q text default null,
  p_category_id uuid default null,
  p_subcategory_id uuid default null,
  p_county_id uuid default null,
  p_badge text default null,
  p_in_stock boolean default false,
  p_sort text default 'relevance',
  p_limit integer default 24,
  p_offset integer default 0
) returns table (id uuid, total bigint)
language sql stable security invoker set search_path = '' as $$
  with q as (
    select t.term, case when t.term is null then null else websearch_to_tsquery('english', t.term) end as tsq
    from (select nullif(left(trim(coalesce(p_q, '')), 80), '') as term) t
  ),
  matches as (
    select p.id, p.price, p.created_at,
      case when q.term is null then 0 else
        ts_rank(p.search, q.tsq) * 2
        + extensions.word_similarity(q.term, p.name)
        + case when b.name ilike '%' || q.term || '%' then 0.5 else 0 end
      end as rank
    from public.products p
    join public.businesses b on b.id = p.business_id
    cross join q
    where p.status = 'published'
      and (p_category_id is null or p.category_id = p_category_id)
      and (p_subcategory_id is null or p.subcategory_id = p_subcategory_id)
      and (p_county_id is null or b.county_id = p_county_id)
      and (p_badge is null or p.badge = p_badge)
      and (not coalesce(p_in_stock, false) or p.in_stock)
      and (
        q.term is null
        or p.search @@ q.tsq
        or extensions.word_similarity(q.term, p.name) > 0.45
        or p.name ilike '%' || q.term || '%'
        or b.name ilike '%' || q.term || '%'
      )
  )
  select m.id, count(*) over () as total
  from matches m
  order by
    case when p_sort = 'price_asc' then m.price end asc nulls last,
    case when p_sort = 'price_desc' then m.price end desc nulls last,
    case when p_sort = 'relevance' then m.rank end desc,
    m.created_at desc,
    m.id
  limit least(greatest(coalesce(p_limit, 24), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$$;
revoke all on function public.search_products(text, uuid, uuid, uuid, text, boolean, text, integer, integer) from public;
grant execute on function public.search_products(text, uuid, uuid, uuid, text, boolean, text, integer, integer) to anon, authenticated, service_role;

-- ---------- Verified shops ----------
-- Set by the super admin after checking a business (e.g. visited, KRA PIN or permit seen).
alter table public.businesses add column if not exists verified_at timestamptz;
grant select (verified_at) on public.businesses to anon, authenticated;

-- ---------- Listing reports ----------
-- Customers can flag a product or shop. Written and read only by the server (service role).
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  product_id uuid references public.products (id) on delete cascade,
  reason text not null check (reason in ('scam', 'wrong_info', 'prohibited', 'unreachable', 'other')),
  details text check (char_length(details) <= 500),
  contact text check (char_length(contact) <= 80),
  fingerprint text,
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  resolved_by uuid references auth.users (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists reports_status_idx on public.reports (status, created_at desc);
create index if not exists reports_fingerprint_idx on public.reports (fingerprint, created_at desc);
alter table public.reports enable row level security;
grant select, insert, update, delete on public.reports to service_role;
