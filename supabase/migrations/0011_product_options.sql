-- SokoBase 0011: real product variations.
-- A product can have up to two option groups, e.g. Colour (Red, Blue) and Size (S, M, L). Every
-- combination is a row in product_variants with its own stock, an optional own price (empty =
-- the product's price), and an optional photo (e.g. the Red one).
--
--   products.options          [{"name": "Colour", "values": ["Red", "Blue"]}, {"name": "Size", "values": ["S", "M"]}]
--   product_variants.attributes  {"Colour": "Red", "Size": "M"}
--   product_variants.image_url   https://res.cloudinary.com/<our cloud>/... (checked by the app)
--
-- Older products keep working: their variants have no attributes and show as a single option list.

begin;

alter table public.products add column if not exists options jsonb not null default '[]'::jsonb
  check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) <= 2);

alter table public.product_variants add column if not exists attributes jsonb not null default '{}'::jsonb
  check (jsonb_typeof(attributes) = 'object');
alter table public.product_variants add column if not exists image_url text
  check (image_url is null or (char_length(image_url) <= 500 and image_url like 'https://res.cloudinary.com/%'));

-- A combination can appear only once per product.
create unique index if not exists product_variants_unique_combo
  on public.product_variants (product_id, attributes) where attributes <> '{}'::jsonb;

-- Browser grants (see 0010): owners may write the new columns; everyone may read them.
grant insert (options) on public.products to authenticated;
grant update (options) on public.products to authenticated;
grant insert (attributes, image_url) on public.product_variants to authenticated;
grant update (attributes, image_url) on public.product_variants to authenticated;

-- save_product: also writes options, and each variant's attributes and photo.
create or replace function public.save_product(p_id uuid, p_business_id uuid, p_slug text, p_fields jsonb, p_variants jsonb)
returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  v_id uuid;
  v_slug text;
  v_images text[] := coalesce(array(select jsonb_array_elements_text(coalesce(p_fields->'images', '[]'::jsonb))), '{}');
  v_options jsonb := coalesce(p_fields->'options', '[]'::jsonb);
begin
  if p_id is null then
    insert into public.products (business_id, slug, category_id, subcategory_id, name, description, price, old_price,
                                 price_type, badge, images, in_stock, status, specs, options)
    values (p_business_id, p_slug, (p_fields->>'category_id')::uuid, (p_fields->>'subcategory_id')::uuid, p_fields->>'name',
            p_fields->>'description', (p_fields->>'price')::numeric, (p_fields->>'old_price')::numeric,
            p_fields->>'price_type', p_fields->>'badge', v_images, coalesce((p_fields->>'in_stock')::boolean, true),
            coalesce(p_fields->>'status', 'published'), coalesce(p_fields->'specs', '{}'::jsonb), v_options)
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
      specs = coalesce(p_fields->'specs', '{}'::jsonb),
      options = v_options
    where id = p_id and business_id = p_business_id
    returning id, slug into v_id, v_slug;
    if v_id is null then
      raise exception 'Product not found.' using errcode = 'P0002';
    end if;
  end if;

  delete from public.product_variants where product_id = v_id;
  insert into public.product_variants (product_id, label, price, old_price, in_stock, sort_order, attributes, image_url)
  select v_id, x.label, x.price, x.old_price, coalesce(x.in_stock, true), coalesce(x.sort_order, 0),
         coalesce(x.attributes, '{}'::jsonb), nullif(x.image_url, '')
  from jsonb_to_recordset(coalesce(p_variants, '[]'::jsonb))
    as x(label text, price numeric, old_price numeric, in_stock boolean, sort_order integer, attributes jsonb, image_url text);

  return jsonb_build_object('id', v_id, 'slug', v_slug);
end $$;
revoke all on function public.save_product(uuid, uuid, text, jsonb, jsonb) from public, anon;
grant execute on function public.save_product(uuid, uuid, text, jsonb, jsonb) to authenticated;

commit;
