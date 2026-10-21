-- SokoBase 0016: platform insights for the admin (Admin > Insights).
--   Aggregates across all shops in the database, so the app never has to page through raw rows.
--   Server only (service role).

create or replace function public.platform_insights(p_from date, p_to date)
returns jsonb
language sql stable security definer set search_path = '' as $$
  with
  rng as (
    select (p_from::timestamp at time zone 'Africa/Nairobi') as t0, ((p_to + 1)::timestamp at time zone 'Africa/Nairobi') as t1
  ),
  views as (
    select v.business_id, v.product_id, v.source, v.fingerprint, v.viewed_on
    from public.page_views v where v.viewed_on between p_from and p_to
  ),
  clicks as (
    select c.business_id, c.product_id, c.created_at
    from public.order_clicks c, rng where c.created_at >= rng.t0 and c.created_at < rng.t1
  )
  select jsonb_build_object(
    'daily', (
      select coalesce(jsonb_agg(d order by d.day), '[]'::jsonb) from (
        select g.day::date as day,
          (select count(*) from views v where v.viewed_on = g.day::date)::int as views,
          (select count(*) from views v where v.viewed_on = g.day::date and v.product_id is not null)::int as product_views,
          (select count(distinct v.fingerprint) from views v where v.viewed_on = g.day::date)::int as visitors,
          (select count(*) from clicks c
             where c.created_at >= (g.day::date::timestamp at time zone 'Africa/Nairobi')
               and c.created_at < ((g.day::date + 1)::timestamp at time zone 'Africa/Nairobi'))::int as clicks
        from generate_series(p_from::timestamp, p_to::timestamp, interval '1 day') as g(day)
      ) d
    ),
    'sources', (
      select coalesce(jsonb_agg(s), '[]'::jsonb) from (
        select source, count(*)::int as n from views group by source
      ) s
    ),
    'shops', (
      select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select business_id, sum(v)::int as views, sum(c)::int as clicks from (
          select business_id, count(*) as v, 0 as c from views group by business_id
          union all
          select business_id, 0, count(*) from clicks group by business_id
        ) u group by business_id
      ) x
    ),
    'categories', (
      select coalesce(jsonb_agg(y), '[]'::jsonb) from (
        select cat.name, sum(u.v)::int as views, sum(u.c)::int as clicks from (
          select p.category_id, count(*) as v, 0 as c from views v join public.products p on p.id = v.product_id group by p.category_id
          union all
          select p.category_id, 0, count(*) from clicks c join public.products p on p.id = c.product_id group by p.category_id
        ) u join public.categories cat on cat.id = u.category_id
        group by cat.name
      ) y
    ),
    'products', (
      select coalesce(jsonb_agg(z), '[]'::jsonb) from (
        select u.product_id, p.name, p.slug, b.name as shop, sum(u.v)::int as views, sum(u.c)::int as clicks from (
          select product_id, count(*) as v, 0 as c from views where product_id is not null group by product_id
          union all
          select product_id, 0, count(*) from clicks where product_id is not null group by product_id
        ) u
        join public.products p on p.id = u.product_id
        join public.businesses b on b.id = p.business_id
        group by u.product_id, p.name, p.slug, b.name
        order by sum(u.c) desc, sum(u.v) desc
        limit 10
      ) z
    ),
    'catalogue', (
      select coalesce(jsonb_agg(k), '[]'::jsonb) from (
        select business_id,
          count(*) filter (where status = 'published')::int as published,
          max(updated_at) as last_update
        from public.products group by business_id
      ) k
    )
  );
$$;
revoke all on function public.platform_insights(date, date) from public, anon, authenticated;
grant execute on function public.platform_insights(date, date) to service_role;
