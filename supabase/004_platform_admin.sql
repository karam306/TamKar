-- TamKar update 004: platform owner panel (merchants, subscriptions, payments).
-- Run once in Supabase: SQL Editor > New query > Run.

-- Business type picked when the store is created (clothing, electronics...).
alter table public.stores add column if not exists business_type text not null default 'general';

-- Shoppers' pages need to know if the subscription is still paid.
grant select (paid_until, plan) on public.stores to anon;

-- Private notes about each merchant. Only the platform (service role) can read them.
create table if not exists public.store_admin (
  store_id uuid primary key references public.stores(id) on delete cascade,
  owner_name text,
  owner_phone text,
  note text,
  updated_at timestamptz not null default now()
);
alter table public.store_admin enable row level security;
grant all on public.store_admin to service_role;

-- Subscription payments the platform owner records (cash, transfer...).
create table if not exists public.subscription_payments (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  amount numeric(14, 2) not null check (amount >= 0),
  currency text not null default 'USD' check (currency in ('USD', 'SYP')),
  months integer not null check (months between 1 and 36),
  method text,
  note text,
  paid_until date not null,
  created_at timestamptz not null default now()
);
create index if not exists subscription_payments_store_idx on public.subscription_payments (store_id, created_at desc);
alter table public.subscription_payments enable row level security;
grant all on public.subscription_payments to service_role;
grant select on public.subscription_payments to authenticated;
create policy "owner reads own payments" on public.subscription_payments
  for select to authenticated using (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));
