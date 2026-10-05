-- SokoBase 0009: record what was actually paid for each subscription period, so the admin's payment
-- summary stays correct even after plan prices change or a discount is given.
alter table public.subscriptions add column if not exists amount_kes integer check (amount_kes is null or amount_kes >= 0);
alter table public.subscriptions add column if not exists cancelled_at timestamptz;

-- Best-effort backfill for existing rows: the plan's current price.
update public.subscriptions s set amount_kes = p.price_kes
from public.plans p
where p.id = s.plan_id and s.amount_kes is null;

create index if not exists subscriptions_created_idx on public.subscriptions (created_at desc);
