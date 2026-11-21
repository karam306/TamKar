-- TamKar update 007: Pro features (staff accounts, branches on orders, shared invoices).
-- Run once in Supabase: SQL Editor > New query > Run. Safe to run again.

-- ───────────── Branch the customer picks up from ─────────────
alter table public.orders add column if not exists branch text;

-- ───────────── Invoice links customers can open ─────────────
alter table public.orders add column if not exists share_token text;

-- ───────────── Staff accounts ─────────────
-- A staff member works on orders, products and customers of one store.
-- Settings, design, discounts and billing stay with the owner.
create table if not exists public.store_staff (
  store_id uuid not null references public.stores(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  name text,
  created_at timestamptz not null default now(),
  primary key (store_id, user_id)
);
create unique index if not exists store_staff_one_store on public.store_staff(user_id);
alter table public.store_staff enable row level security;
grant all on public.store_staff to service_role;
grant select on public.store_staff to authenticated;
drop policy if exists "staff reads own membership" on public.store_staff;
create policy "staff reads own membership" on public.store_staff
  for select to authenticated using (user_id = auth.uid());

-- Same rights as the owner on day-to-day tables (policies add up, so the owner's stay as they are).
drop policy if exists "staff reads store" on public.stores;
create policy "staff reads store" on public.stores
  for select to authenticated using (exists (select 1 from public.store_staff st where st.store_id = id and st.user_id = auth.uid()));

drop policy if exists "staff manages products" on public.products;
create policy "staff manages products" on public.products
  for all to authenticated
  using (exists (select 1 from public.store_staff st where st.store_id = products.store_id and st.user_id = auth.uid()))
  with check (exists (select 1 from public.store_staff st where st.store_id = products.store_id and st.user_id = auth.uid()));

drop policy if exists "staff manages collections" on public.collections;
create policy "staff manages collections" on public.collections
  for all to authenticated
  using (exists (select 1 from public.store_staff st where st.store_id = collections.store_id and st.user_id = auth.uid()))
  with check (exists (select 1 from public.store_staff st where st.store_id = collections.store_id and st.user_id = auth.uid()));

drop policy if exists "staff reads orders" on public.orders;
create policy "staff reads orders" on public.orders
  for select to authenticated using (exists (select 1 from public.store_staff st where st.store_id = orders.store_id and st.user_id = auth.uid()));
drop policy if exists "staff updates orders" on public.orders;
create policy "staff updates orders" on public.orders
  for update to authenticated using (exists (select 1 from public.store_staff st where st.store_id = orders.store_id and st.user_id = auth.uid()));

drop policy if exists "staff reads customers" on public.customers;
create policy "staff reads customers" on public.customers
  for select to authenticated using (exists (select 1 from public.store_staff st where st.store_id = customers.store_id and st.user_id = auth.uid()));
drop policy if exists "staff updates customers" on public.customers;
create policy "staff updates customers" on public.customers
  for update to authenticated using (exists (select 1 from public.store_staff st where st.store_id = customers.store_id and st.user_id = auth.uid()));

drop policy if exists "staff reads order events" on public.order_events;
create policy "staff reads order events" on public.order_events
  for select to authenticated using (exists (select 1 from public.store_staff st where st.store_id = order_events.store_id and st.user_id = auth.uid()));
drop policy if exists "staff adds order events" on public.order_events;
create policy "staff adds order events" on public.order_events
  for insert to authenticated
  with check (exists (select 1 from public.orders o join public.store_staff st on st.store_id = o.store_id
                      where o.id = order_id and o.store_id = order_events.store_id and st.user_id = auth.uid()));

drop policy if exists "staff reads stats" on public.store_stats;
create policy "staff reads stats" on public.store_stats
  for select to authenticated using (exists (select 1 from public.store_staff st where st.store_id = store_stats.store_id and st.user_id = auth.uid()));
