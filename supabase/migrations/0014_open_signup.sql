-- SokoBase 0014: open sign-up with admin approval.
--   A business can now sign up from the public Sell page without an invite. Its shop is created
--   with no subscription ("pending"): the owner can set it up and add up to 10 products, but
--   customers cannot see it (business_is_public still requires a live plan). Approving = the admin
--   adds a subscription (free trial or paid), exactly like a renewal.

-- ---------- Pending shops ----------
-- A shop that has never had a subscription is waiting for approval.
create or replace function public.business_is_pending(bid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select not exists (select 1 from public.subscriptions s where s.business_id = bid);
$$;
revoke all on function public.business_is_pending(uuid) from public, anon;
grant execute on function public.business_is_pending(uuid) to authenticated, service_role;

-- Owners may edit products while their plan is live (as before) OR while their shop is pending.
-- Shops whose plan has lapsed stay read-only until renewed.
create or replace function public.business_can_write(bid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.businesses b
    where b.id = bid
      and b.owner_id = (select auth.uid())
      and b.status = 'active'
      and (
        exists (
          select 1 from public.subscriptions s
          where s.business_id = b.id and s.status = 'active' and s.starts_at <= now() and s.ends_at > now()
        )
        or not exists (select 1 from public.subscriptions s where s.business_id = b.id)
      )
  );
$$;

-- Product limit: the live plan's limit as before; 10 while the shop is waiting for approval.
create or replace function public.enforce_product_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  lim integer;
  cnt integer;
  pending boolean;
begin
  perform pg_advisory_xact_lock(hashtextextended('product_limit:' || new.business_id::text, 0));

  pending := not exists (select 1 from public.subscriptions s where s.business_id = new.business_id);
  if pending then
    select count(*) into cnt from public.products where business_id = new.business_id;
    if cnt >= 10 then
      raise exception 'You can add up to 10 products while your shop is waiting for approval. You can add more once SokoBase approves it.' using errcode = 'P0001';
    end if;
    return new;
  end if;

  select p.product_limit into lim
  from public.subscriptions s
  join public.plans p on p.id = s.plan_id
  where s.business_id = new.business_id and s.status = 'active' and s.ends_at > now()
  order by s.ends_at desc limit 1;

  if lim is null then
    return new; -- unlimited plan (no live plan is blocked by the write policy)
  end if;

  select count(*) into cnt from public.products where business_id = new.business_id;
  if cnt >= lim then
    raise exception 'Product limit reached for your plan (% products).', lim using errcode = 'P0001';
  end if;
  return new;
end $$;
revoke all on function public.enforce_product_limit() from public, anon, authenticated;

-- ---------- What the applicant asked for ----------
-- The plan chosen on the Sell page (a hint for the admin when approving). Server only: not
-- granted to signed-in users, so it is invisible to everyone but the service role.
alter table public.businesses add column if not exists requested_plan_id uuid references public.plans(id) on delete set null;

-- ---------- Sign-up rate limiting ----------
-- One row per sign-up attempt, keyed by an anonymous daily fingerprint (see src/lib/fingerprint.ts).
-- Service role only: no policies, no grants to anon/authenticated.
create table if not exists public.signup_attempts (
  id bigint generated always as identity primary key,
  fingerprint text not null,
  created_at timestamptz not null default now()
);
create index if not exists signup_attempts_fp_idx on public.signup_attempts (fingerprint, created_at desc);
create index if not exists signup_attempts_created_idx on public.signup_attempts (created_at desc);
alter table public.signup_attempts enable row level security;
revoke all on public.signup_attempts from anon, authenticated;
grant select, insert, delete on public.signup_attempts to service_role;
