-- Nama update 008: price quotes (عروض أسعار) the merchant sends to a customer as a PDF link. Pro.
-- Run once in Supabase: SQL Editor > New query > Run. Safe to run again.

create sequence if not exists public.quote_number_seq start 1001;

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  number bigint not null default nextval('public.quote_number_seq'),
  store_id uuid not null references public.stores(id) on delete cascade,
  customer_name text not null check (char_length(customer_name) between 1 and 120),
  phone text,
  items jsonb not null default '[]'::jsonb,       -- [{ title, variantTitle, price, qty, productId? }]
  discount numeric(14, 2) not null default 0 check (discount >= 0),
  delivery_fee numeric(14, 2) not null default 0 check (delivery_fee >= 0),
  total numeric(14, 2) not null default 0,
  notes text,
  valid_until date,
  status text not null default 'sent' check (status in ('sent', 'accepted', 'declined')),
  share_token text unique,
  created_at timestamptz not null default now()
);
create index if not exists quotes_store_created on public.quotes(store_id, created_at desc);

alter table public.quotes enable row level security;
grant all on public.quotes to service_role;
grant usage, select on sequence public.quote_number_seq to service_role, authenticated;
grant select, insert, update, delete on public.quotes to authenticated;

drop policy if exists "owner manages quotes" on public.quotes;
create policy "owner manages quotes" on public.quotes
  for all to authenticated
  using (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));
drop policy if exists "staff manages quotes" on public.quotes;
create policy "staff manages quotes" on public.quotes
  for all to authenticated
  using (exists (select 1 from public.store_staff st where st.store_id = quotes.store_id and st.user_id = auth.uid()))
  with check (exists (select 1 from public.store_staff st where st.store_id = quotes.store_id and st.user_id = auth.uid()));
