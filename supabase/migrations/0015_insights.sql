-- SokoBase 0015: seller insights.
--   Counts product-page and shop-page views (once per visitor per page per day, using the same
--   anonymous daily fingerprint as order clicks), where visitors came from, and a per-shop summary
--   for the dashboard Insights page and the weekly email.

create table if not exists public.page_views (
  id bigint generated always as identity primary key,
  business_id uuid not null references public.businesses (id) on delete cascade,
  product_id uuid references public.products (id) on delete cascade, -- null = the shop page
  fingerprint text not null,
  source text not null default 'direct'
    check (source in ('whatsapp', 'social', 'google', 'sokobase', 'direct', 'other')),
  viewed_on date not null default ((now() at time zone 'Africa/Nairobi')::date),
  created_at timestamptz not null default now()
);
-- One view per visitor, page and day.
create unique index if not exists page_views_daily_uniq
  on public.page_views (fingerprint, business_id, coalesce(product_id, '00000000-0000-0000-0000-000000000000'::uuid), viewed_on);
create index if not exists page_views_business_day_idx on public.page_views (business_id, viewed_on);
alter table public.page_views enable row level security;
revoke all on public.page_views from anon, authenticated;
grant select, insert, delete on public.page_views to service_role;

-- Owners can switch the weekly insights email off.
alter table public.businesses add column if not exists weekly_report boolean not null default true;
grant select (weekly_report), update (weekly_report) on public.businesses to authenticated;

-- One shop's numbers between two dates (inclusive, Nairobi days). Server only: the app calls it
-- with the service role after verifying the caller owns the shop.
create or replace function public.shop_insights(p_business_id uuid, p_from date, p_to date)
returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'daily', (
      select coalesce(jsonb_agg(d order by d.day), '[]'::jsonb) from (
        select g.day::date as day,
          (select count(*) from public.page_views v where v.business_id = p_business_id and v.viewed_on = g.day::date and v.product_id is not null)::int as product_views,
          (select count(*) from public.page_views v where v.business_id = p_business_id and v.viewed_on = g.day::date and v.product_id is null)::int as shop_views,
          (select count(*) from public.order_clicks c where c.business_id = p_business_id
             and c.created_at >= (g.day::date::timestamp at time zone 'Africa/Nairobi')
             and c.created_at < ((g.day::date + 1)::timestamp at time zone 'Africa/Nairobi'))::int as clicks
        from generate_series(p_from::timestamp, p_to::timestamp, interval '1 day') as g(day)
      ) d
    ),
    'products', (
      select coalesce(jsonb_agg(p), '[]'::jsonb) from (
        select product_id, sum(views)::int as views, sum(clicks)::int as clicks from (
          select v.product_id, count(*) as views, 0 as clicks from public.page_views v
          where v.business_id = p_business_id and v.product_id is not null and v.viewed_on between p_from and p_to
          group by v.product_id
          union all
          select c.product_id, 0, count(*) from public.order_clicks c
          where c.business_id = p_business_id and c.product_id is not null
            and c.created_at >= (p_from::timestamp at time zone 'Africa/Nairobi')
            and c.created_at < ((p_to + 1)::timestamp at time zone 'Africa/Nairobi')
          group by c.product_id
        ) x group by product_id
      ) p
    ),
    'sources', (
      select coalesce(jsonb_agg(s), '[]'::jsonb) from (
        select v.source, count(*)::int as n from public.page_views v
        where v.business_id = p_business_id and v.viewed_on between p_from and p_to
        group by v.source
      ) s
    )
  );
$$;
revoke all on function public.shop_insights(uuid, date, date) from public, anon, authenticated;
grant execute on function public.shop_insights(uuid, date, date) to service_role;
