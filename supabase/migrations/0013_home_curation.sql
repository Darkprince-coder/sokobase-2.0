-- SokoBase 0013: home page curation.
--   1. "Feature on home" for products and shops, set by the super admin only (service role).
--   2. search_products() gains a deals filter (real discounts: old price above price) and a
--      "biggest discount" sort, so "See all deals" lists genuine offers, not self-applied badges.

begin;

-- 1. Featured flags. Readable by everyone (decides what the home page shows); writable only by
--    the server after an admin check: no browser grants for writes.
alter table public.products add column if not exists featured_at timestamptz;
alter table public.businesses add column if not exists featured_at timestamptz;
grant select (featured_at) on public.businesses to anon, authenticated;
-- products: anon/authenticated already have table-level SELECT (see 0010), which covers the new column.
create index if not exists products_featured_idx on public.products (featured_at desc) where featured_at is not null;

-- 2. Search with a deals filter. Same body as 0008 plus p_deals and sort 'discount'.
drop function if exists public.search_products(text, uuid, uuid, uuid, text, boolean, text, integer, integer);

create or replace function public.search_products(
  p_q text default null,
  p_category_id uuid default null,
  p_subcategory_id uuid default null,
  p_county_id uuid default null,
  p_badge text default null,
  p_in_stock boolean default false,
  p_sort text default 'relevance',
  p_limit integer default 24,
  p_offset integer default 0,
  p_deals boolean default false
) returns table (id uuid, total bigint)
language sql stable security invoker set search_path = '' as $$
  with q as (
    select t.term, case when t.term is null then null else websearch_to_tsquery('english', t.term) end as tsq
    from (select nullif(left(trim(coalesce(p_q, '')), 80), '') as term) t
  ),
  matches as (
    select p.id, p.price, p.created_at,
      case when p.old_price is not null and p.price is not null and p.old_price > p.price
           then (p.old_price - p.price) / p.old_price else 0 end as discount,
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
      and (not coalesce(p_deals, false) or (p.old_price is not null and p.price is not null and p.old_price > p.price))
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
    case when p_sort = 'discount' then m.discount end desc,
    case when p_sort = 'relevance' then m.rank end desc,
    m.created_at desc,
    m.id
  limit least(greatest(coalesce(p_limit, 24), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$$;
revoke all on function public.search_products(text, uuid, uuid, uuid, text, boolean, text, integer, integer, boolean) from public;
grant execute on function public.search_products(text, uuid, uuid, uuid, text, boolean, text, integer, integer, boolean) to anon, authenticated, service_role;

commit;
