-- Kun update 013: exchange-rate pricing and the debt ledger (selling on credit).
-- Run once in Supabase: SQL Editor > New query > paste > Run. Safe to run again.

-- 1) Exchange rate. The store's current rate lives in stores.shipping->'fx' (no change needed).
--    Each order and quote keeps the rate it was made at, so old invoices never change.
alter table public.orders add column if not exists fx jsonb;
alter table public.quotes add column if not exists fx jsonb;

-- 2) Debt ledger. An order can be marked "on credit": the customer pays later, in parts.
alter table public.orders add column if not exists on_credit boolean not null default false;

create table if not exists public.order_payments (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),   -- in the store's currency
  note text,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists order_payments_order on public.order_payments(order_id);
create index if not exists order_payments_store on public.order_payments(store_id, created_at desc);
create index if not exists orders_on_credit on public.orders(store_id) where on_credit;

alter table public.order_payments enable row level security;
grant all on public.order_payments to service_role;
grant select on public.order_payments to authenticated;

drop policy if exists "owner reads payments" on public.order_payments;
create policy "owner reads payments" on public.order_payments
  for select to authenticated
  using (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));

drop policy if exists "staff reads payments" on public.order_payments;
create policy "staff reads payments" on public.order_payments
  for select to authenticated using (public.staff_can(store_id, 'orders', 'customers'));
