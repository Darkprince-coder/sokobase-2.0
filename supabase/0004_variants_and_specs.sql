-- SokoBase 0004: product specs + size/colour variants with their own price.

alter table public.products add column if not exists specs jsonb not null default '{}'::jsonb;
grant insert (specs) on public.products to authenticated;
grant update (specs) on public.products to authenticated;

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  label text not null check (char_length(label) between 1 and 40), -- e.g. "42", "Red", "1kg"
  price numeric(12, 2) check (price is null or price >= 0),
  old_price numeric(12, 2) check (old_price is null or old_price > 0),
  in_stock boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  check (old_price is null or price is null or old_price > price)
);
create index product_variants_product_idx on public.product_variants (product_id);

alter table public.product_variants enable row level security;

grant select on public.product_variants to anon, authenticated;
grant insert (product_id, label, price, old_price, in_stock, sort_order) on public.product_variants to authenticated;
grant update (label, price, old_price, in_stock, sort_order) on public.product_variants to authenticated;
grant delete on public.product_variants to authenticated;
grant select, insert, update, delete on public.product_variants to service_role;

create policy variants_public_read on public.product_variants for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_variants.product_id and p.status = 'published'));

create policy variants_owner_read on public.product_variants for select to authenticated
  using (exists (select 1 from public.products p where p.id = product_variants.product_id and public.owns_business(p.business_id)));

create policy variants_owner_insert on public.product_variants for insert to authenticated
  with check (exists (select 1 from public.products p where p.id = product_variants.product_id and public.business_can_write(p.business_id)));

create policy variants_owner_update on public.product_variants for update to authenticated
  using (exists (select 1 from public.products p where p.id = product_variants.product_id and public.owns_business(p.business_id)))
  with check (exists (select 1 from public.products p where p.id = product_variants.product_id and public.business_can_write(p.business_id)));

create policy variants_owner_delete on public.product_variants for delete to authenticated
  using (exists (select 1 from public.products p where p.id = product_variants.product_id and public.business_can_write(p.business_id)));
