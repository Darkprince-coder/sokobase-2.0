-- SokoBase 0003: starting data. Edit prices and limits in the super admin (Session 3) or here.

insert into public.plans (slug, name, product_limit, price_kes, duration_days, sort_order) values
  ('basic', 'Basic', 20, 0, 30, 1),
  ('standard', 'Standard', 60, 0, 30, 2),
  ('pro', 'Pro', null, 0, 30, 3);

insert into public.categories (slug, name, icon, sort_order) values
  ('phones-tablets', 'Phones & Tablets', 'smartphone', 1),
  ('electronics', 'Electronics', 'laptop', 2),
  ('fashion', 'Fashion', 'shirt', 3),
  ('home-kitchen', 'Home & Kitchen', 'sofa', 4),
  ('beauty', 'Beauty & Personal Care', 'sparkles', 5),
  ('groceries', 'Groceries', 'shopping-basket', 6),
  ('baby-kids', 'Baby & Kids', 'baby', 7),
  ('sports', 'Sports & Outdoors', 'dumbbell', 8),
  ('automotive', 'Automotive', 'car', 9),
  ('services', 'Services', 'wrench', 10);

insert into public.platform_settings (key, value) values ('hero_slides', '[]'::jsonb);
