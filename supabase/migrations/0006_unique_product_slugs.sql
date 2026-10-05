-- SokoBase 0006: product slugs become globally unique.
-- /products/[slug] looks a product up by slug alone, so two shops sharing a slug made both pages 404.
-- The oldest product keeps its slug (and URL); later duplicates get a short random suffix.

with ranked as (
  select id, slug, row_number() over (partition by slug order by created_at, id) as rn
  from public.products
)
update public.products p
set slug = left(r.slug, 113) || '-' || substr(md5(p.id::text), 1, 6)
from ranked r
where p.id = r.id and r.rn > 1;

alter table public.products drop constraint if exists products_business_id_slug_key;
create unique index if not exists products_slug_key on public.products (slug);
