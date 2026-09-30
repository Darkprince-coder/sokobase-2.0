-- SokoBase 0005: counties, multi-category businesses (up to 3), curated product subcategories.

-- ---------- Counties (static reference data, all 47) ----------
create table public.counties (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  sort_order integer not null default 0
);
alter table public.counties enable row level security;
grant select on public.counties to anon, authenticated;
grant select, insert, update, delete on public.counties to service_role;
create policy counties_read on public.counties for select to anon, authenticated using (true);

insert into public.counties (slug, name, sort_order) values
('mombasa','Mombasa',1),('kwale','Kwale',2),('kilifi','Kilifi',3),('tana-river','Tana River',4),
('lamu','Lamu',5),('taita-taveta','Taita-Taveta',6),('garissa','Garissa',7),('wajir','Wajir',8),
('mandera','Mandera',9),('marsabit','Marsabit',10),('isiolo','Isiolo',11),('meru','Meru',12),
('tharaka-nithi','Tharaka-Nithi',13),('embu','Embu',14),('kitui','Kitui',15),('machakos','Machakos',16),
('makueni','Makueni',17),('nyandarua','Nyandarua',18),('nyeri','Nyeri',19),('kirinyaga','Kirinyaga',20),
('muranga','Murang''a',21),('kiambu','Kiambu',22),('turkana','Turkana',23),('west-pokot','West Pokot',24),
('samburu','Samburu',25),('trans-nzoia','Trans Nzoia',26),('uasin-gishu','Uasin Gishu',27),('elgeyo-marakwet','Elgeyo-Marakwet',28),
('nandi','Nandi',29),('baringo','Baringo',30),('laikipia','Laikipia',31),('nakuru','Nakuru',32),
('narok','Narok',33),('kajiado','Kajiado',34),('kericho','Kericho',35),('bomet','Bomet',36),
('kakamega','Kakamega',37),('vihiga','Vihiga',38),('bungoma','Bungoma',39),('busia','Busia',40),
('siaya','Siaya',41),('kisumu','Kisumu',42),('homa-bay','Homa Bay',43),('migori','Migori',44),
('kisii','Kisii',45),('nyamira','Nyamira',46),('nairobi','Nairobi',47);

-- ---------- Businesses: county + drop single category in favour of the join table below ----------
alter table public.businesses add column county_id uuid references public.counties (id);
grant select (county_id) on public.businesses to anon, authenticated;
grant insert (county_id) on public.businesses to service_role;
grant update (county_id) on public.businesses to authenticated;
alter table public.businesses drop column category_id;

create table public.business_categories (
  business_id uuid not null references public.businesses (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  primary key (business_id, category_id)
);
alter table public.business_categories enable row level security;
grant select on public.business_categories to anon, authenticated;
grant insert, delete on public.business_categories to authenticated;
grant select, insert, update, delete on public.business_categories to service_role;

create policy bizcat_public_read on public.business_categories for select to anon, authenticated
  using (exists (select 1 from public.businesses b where b.id = business_categories.business_id and b.status = 'active'));
create policy bizcat_owner_read on public.business_categories for select to authenticated
  using (public.owns_business(business_id));
create policy bizcat_owner_insert on public.business_categories for insert to authenticated
  with check (public.owns_business(business_id));
create policy bizcat_owner_delete on public.business_categories for delete to authenticated
  using (public.owns_business(business_id));

create function public.enforce_category_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare cnt integer;
begin
  select count(*) into cnt from public.business_categories where business_id = new.business_id;
  if cnt >= 3 then
    raise exception 'You can select up to 3 categories.' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger bizcat_limit before insert on public.business_categories for each row execute function public.enforce_category_limit();
revoke all on function public.enforce_category_limit() from public, anon, authenticated;

-- ---------- Curated product subcategories, nested under a category ----------
create table public.subcategories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  sort_order integer not null default 0,
  active boolean not null default true,
  unique (category_id, slug),
  unique (id, category_id) -- lets products' FK below guarantee the pairing is always consistent
);
alter table public.subcategories enable row level security;
grant select on public.subcategories to anon, authenticated;
grant select, insert, update, delete on public.subcategories to service_role;
create policy subcategories_read on public.subcategories for select to anon, authenticated using (active);

alter table public.products add column subcategory_id uuid;
alter table public.products add constraint products_subcategory_fk
  foreign key (subcategory_id, category_id) references public.subcategories (id, category_id);
grant insert (subcategory_id) on public.products to authenticated;
grant update (subcategory_id) on public.products to authenticated;
