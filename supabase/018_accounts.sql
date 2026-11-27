-- Kun update 018: shop accounts (حسابات المحل).
-- Cost prices and profit, expenses (with monthly repeats), the daily cash close,
-- suppliers, purchases and what the shop owes them.
-- Run once in Supabase: SQL Editor > New query > paste > Run. Safe to run again.
-- Everything here is private to the store owner: shoppers can never read cost prices.

-- ───────────── 1) Cost prices ─────────────
-- Kept outside "products" on purpose: products are readable by shoppers, costs are not.
-- cost = the product's cost; variant_costs = {"<variant title>": cost} when a variant differs.
create table if not exists public.product_costs (
  product_id uuid primary key references public.products(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  cost numeric(14,2) check (cost is null or cost >= 0),
  variant_costs jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create index if not exists product_costs_store on public.product_costs(store_id);

-- What each order cost the shop, saved when the order is made, so later price changes
-- never rewrite past profit. "missing" counts lines that had no cost yet.
create table if not exists public.order_costs (
  order_id uuid primary key references public.orders(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  cost numeric(14,2) not null default 0,
  missing int not null default 0
);
create index if not exists order_costs_store on public.order_costs(store_id);

create or replace function public.snapshot_order_cost() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.order_costs (order_id, store_id, cost, missing)
  select new.id, new.store_id,
         coalesce(sum(coalesce((it->>'qty')::numeric, 0) * c.unit_cost), 0),
         count(*) filter (where c.unit_cost is null)::int
  from jsonb_array_elements(case when jsonb_typeof(new.items) = 'array' then new.items else '[]'::jsonb end) it
  left join lateral (
    select coalesce(
             case when coalesce(it->>'variantTitle', '') <> ''
                  then nullif(pc.variant_costs->>(it->>'variantTitle'), '')::numeric end,
             pc.cost) as unit_cost
    from public.product_costs pc
    where pc.product_id::text = it->>'productId'
  ) c on true
  on conflict (order_id) do nothing;
  return new;
exception when others then
  return new; -- a cost problem must never stop an order
end $$;

drop trigger if exists orders_snapshot_cost on public.orders;
create trigger orders_snapshot_cost after insert on public.orders
  for each row execute function public.snapshot_order_cost();

-- ───────────── 2) Expenses ─────────────
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  day date not null default (now() at time zone 'Asia/Damascus')::date,
  amount numeric(14,2) not null check (amount > 0),
  category text not null,
  note text,
  paid_from text not null default 'cash',   -- cash, sham_cash, syriatel_cash, mtn_cash, bank, other
  branch text not null default '',          -- '' = the main shop
  recurring_id uuid,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists expenses_store_day on public.expenses(store_id, day desc);

-- Expenses that repeat every month (rent, salaries, generator). Added on their day, once a month.
create table if not exists public.recurring_expenses (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  category text not null,
  note text,
  paid_from text not null default 'cash',
  branch text not null default '',
  day_of_month int not null default 1 check (day_of_month between 1 and 28),
  active boolean not null default true,
  last_month text,                          -- 'YYYY-MM' of the last month it was added
  created_at timestamptz not null default now()
);
create index if not exists recurring_expenses_store on public.recurring_expenses(store_id);

-- ───────────── 3) Daily cash close ─────────────
create table if not exists public.cash_closes (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  branch text not null default '',
  day date not null,
  opening numeric(14,2) not null default 0,
  expected numeric(14,2) not null,
  counted numeric(14,2) not null,
  difference numeric(14,2) generated always as (counted - expected) stored,
  details jsonb,
  note text,
  closed_by uuid,
  created_at timestamptz not null default now(),
  unique (store_id, branch, day)
);

-- How a debt payment was received, so cash payments count in the cash close.
alter table public.order_payments add column if not exists method text not null default 'cash';

-- ───────────── 4) Suppliers and purchases ─────────────
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  phone text,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists suppliers_store on public.suppliers(store_id);

-- A purchase invoice: stock comes in, the shop pays now or later.
-- items: [{productId, variantId, variantTitle, title, qty, cost}]
create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete set null,
  day date not null default (now() at time zone 'Asia/Damascus')::date,
  ref text,                                 -- the supplier's invoice number
  items jsonb not null default '[]'::jsonb,
  total numeric(14,2) not null check (total >= 0),
  paid numeric(14,2) not null default 0 check (paid >= 0),
  paid_from text not null default 'cash',
  branch text not null default '',
  note text,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists purchases_store_day on public.purchases(store_id, day desc);
create index if not exists purchases_supplier on public.purchases(supplier_id);

-- Later payments to a supplier (on top of what was paid with each invoice).
create table if not exists public.supplier_payments (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  day date not null default (now() at time zone 'Asia/Damascus')::date,
  amount numeric(14,2) not null check (amount > 0),
  paid_from text not null default 'cash',
  branch text not null default '',
  note text,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists supplier_payments_supplier on public.supplier_payments(supplier_id);
create index if not exists supplier_payments_store_day on public.supplier_payments(store_id, day desc);

-- Puts purchased stock on the shelf and updates the cost (weighted average of old and new stock).
-- Only for products that track stock; the cost is updated either way.
create or replace function public.receive_stock(
  p_store uuid, p_product uuid, p_variant text, p_qty int, p_cost numeric
) returns void
language plpgsql security definer set search_path = public as $$
declare
  prod public.products;
  v jsonb;
  v_idx int := -1;
  v_title text;
  old_stock int;
  old_cost numeric;
  new_cost numeric;
begin
  if p_qty is null or p_qty <= 0 then return; end if;
  select * into prod from public.products where id = p_product and store_id = p_store for update;
  if not found then return; end if;

  if coalesce(p_variant, '') <> '' and jsonb_typeof(prod.variants) = 'array' then
    for i in 0 .. jsonb_array_length(prod.variants) - 1 loop
      v := prod.variants -> i;
      if v->>'id' = p_variant or v->>'title' = p_variant then v_idx := i; exit; end if;
    end loop;
  end if;

  if v_idx >= 0 then
    v_title := v->>'title';
    old_stock := (v->>'stock')::int;
    if old_stock is not null then
      update public.products
        set variants = jsonb_set(variants, array[v_idx::text, 'stock'], to_jsonb(old_stock + p_qty))
        where id = prod.id;
    end if;
    select coalesce(nullif(variant_costs->>v_title, '')::numeric, cost) into old_cost
      from public.product_costs where product_id = prod.id;
  else
    old_stock := prod.stock;
    if old_stock is not null then
      update public.products set stock = stock + p_qty where id = prod.id;
    end if;
    select cost into old_cost from public.product_costs where product_id = prod.id;
  end if;

  if p_cost is null or p_cost < 0 then return; end if;
  if old_cost is not null and coalesce(old_stock, 0) > 0 then
    new_cost := round((old_stock * old_cost + p_qty * p_cost) / (old_stock + p_qty), 2);
  else
    new_cost := p_cost;
  end if;

  insert into public.product_costs (product_id, store_id, cost)
    values (prod.id, p_store, case when v_idx >= 0 then null else new_cost end)
    on conflict (product_id) do nothing;
  if v_idx >= 0 then
    update public.product_costs
      set variant_costs = variant_costs || jsonb_build_object(v_title, new_cost), updated_at = now()
      where product_id = prod.id;
  else
    update public.product_costs set cost = new_cost, updated_at = now() where product_id = prod.id;
  end if;
end $$;

-- ───────────── Access ─────────────
-- The server writes with the service role after checking the owner. The owner may read their own rows.
do $$
declare t text;
begin
  foreach t in array array['product_costs','order_costs','expenses','recurring_expenses','cash_closes',
                           'suppliers','purchases','supplier_payments'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('grant select on public.%I to authenticated', t);
    execute format('drop policy if exists "owner reads" on public.%I', t);
    execute format('create policy "owner reads" on public.%I for select to authenticated using (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()))', t);
  end loop;
end $$;
revoke all on function public.receive_stock(uuid, uuid, text, int, numeric) from public, anon, authenticated;
grant execute on function public.receive_stock(uuid, uuid, text, int, numeric) to service_role;

-- AI: reading supplier invoices counts toward the same monthly allowance (update 017).
do $$
begin
  if to_regclass('public.ai_usage') is not null then
    grant all on public.ai_usage to service_role;
    grant usage, select on sequence public.ai_usage_id_seq to service_role;
    alter table public.ai_usage drop constraint if exists ai_usage_kind_check;
    alter table public.ai_usage add constraint ai_usage_kind_check
      check (kind in ('product', 'price_list', 'store', 'invoice'));
  end if;
end $$;
