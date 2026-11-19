-- TamKar update 002: product options, collections, customers, order timeline,
-- automatic stock deduction. Run once in Supabase: SQL Editor > New query > Run.

-- ───────────── Products: options, variants, collections ─────────────
alter table public.products
  add column if not exists options jsonb not null default '[]'::jsonb,   -- [{ "name": "المقاس", "values": ["S","M"] }]
  add column if not exists variants jsonb not null default '[]'::jsonb,  -- [{ "id","title","options":[..],"price","compare_at_price","stock","sku" }]
  add column if not exists sku text,
  add column if not exists collection_ids uuid[] not null default '{}';

create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  handle text not null check (handle ~ '^[a-z0-9-]{1,60}$'),
  description text,
  image text,
  created_at timestamptz not null default now(),
  unique (store_id, handle)
);

-- ───────────── Customers ─────────────
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  phone text not null,
  city text,
  address text,
  note text,
  orders_count integer not null default 0,
  total_spent numeric(14, 2) not null default 0,
  last_order_at timestamptz,
  created_at timestamptz not null default now(),
  unique (store_id, phone)
);

-- ───────────── Orders: more detail ─────────────
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('new', 'confirmed', 'shipped', 'delivered', 'cancelled'));
alter table public.orders
  add column if not exists payment_status text not null default 'pending' check (payment_status in ('pending', 'paid')),
  add column if not exists customer_id uuid references public.customers(id) on delete set null,
  add column if not exists source text not null default 'online' check (source in ('online', 'manual')),
  add column if not exists merchant_note text;

create table if not exists public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  message text not null check (char_length(message) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists order_events_order_idx on public.order_events (order_id, created_at);
create index if not exists orders_customer_idx on public.orders (customer_id);

-- ───────────── Access ─────────────
alter table public.collections enable row level security;
alter table public.customers enable row level security;
alter table public.order_events enable row level security;

grant all on public.collections, public.customers, public.order_events to service_role;
grant select, insert, update, delete on public.collections to authenticated;
grant select, update on public.customers to authenticated;
grant select, insert on public.order_events to authenticated;
grant select on public.collections to anon;

create policy "public reads collections" on public.collections
  for select using (exists (select 1 from public.stores s where s.id = store_id and s.status = 'active'));
create policy "owner manages own collections" on public.collections
  for all to authenticated
  using (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));
create policy "owner reads own customers" on public.customers
  for select to authenticated using (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));
create policy "owner updates own customers" on public.customers
  for update to authenticated using (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));
create policy "owner reads own order events" on public.order_events
  for select to authenticated using (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));
create policy "owner adds own order events" on public.order_events
  for insert to authenticated
  with check (exists (select 1 from public.orders o join public.stores s on s.id = o.store_id
                      where o.id = order_id and o.store_id = store_id and s.owner_id = auth.uid()));

-- ───────────── Placing an order (all or nothing) ─────────────
-- Checks real prices and v_stock, deducts v_stock, saves the customer and the order
-- in one step, so two shoppers can never buy the last piece at the same time.
create or replace function public.place_order(
  p_store uuid, p_customer jsonb, p_items jsonb, p_source text default 'online', p_note text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  item jsonb;
  prod public.products%rowtype;
  v jsonb;
  v_idx int;
  v_id text;
  v_qty int;
  v_price numeric;
  v_stock int;
  v_lines jsonb := '[]'::jsonb;
  v_total numeric := 0;
  cust_id uuid;
  ord record;
begin
  if p_source not in ('online', 'manual') then raise exception 'BAD_SOURCE'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'EMPTY'; end if;

  for item in select * from jsonb_array_elements(p_items) loop
    v_qty := (item->>'qty')::int;
    if v_qty is null or v_qty < 1 or v_qty > 999 then raise exception 'BAD_QTY'; end if;

    select * into prod from public.products
      where id = (item->>'productId')::uuid and store_id = p_store for update;
    if not found or (not prod.active and p_source = 'online') then
      raise exception 'NOT_AVAILABLE:%', coalesce(prod.title, '');
    end if;

    v_id := item->>'variantId';
    if jsonb_array_length(prod.variants) > 0 then
      select e.value, e.idx - 1 into v, v_idx
        from jsonb_array_elements(prod.variants) with ordinality as e(value, idx)
        where e.value->>'id' = v_id;
      if v is null then raise exception 'VARIANT_REQUIRED:%', prod.title; end if;
      v_price := coalesce((v->>'price')::numeric, prod.price);
      v_stock := (v->>'stock')::int;
      if v_stock is not null then
        if v_stock < v_qty then raise exception 'OUT_OF_STOCK:% (%)', prod.title, v->>'title'; end if;
        update public.products set variants = jsonb_set(variants, array[v_idx::text, 'stock'], to_jsonb(v_stock - v_qty))
          where id = prod.id;
      end if;
    else
      v := null;
      v_price := prod.price;
      if prod.stock is not null then
        if prod.stock < v_qty then raise exception 'OUT_OF_STOCK:%', prod.title; end if;
        update public.products set stock = stock - v_qty where id = prod.id;
      end if;
    end if;

    v_lines := v_lines || jsonb_build_object(
      'productId', prod.id, 'variantId', v->>'id', 'title', prod.title, 'variantTitle', v->>'title',
      'price', v_price, 'qty', v_qty, 'image', prod.images[1]);
    v_total := v_total + v_price * v_qty;
  end loop;

  insert into public.customers as c (store_id, name, phone, city, address, orders_count, total_spent, last_order_at)
  values (p_store, p_customer->>'name', p_customer->>'phone', p_customer->>'city', p_customer->>'address', 1, v_total, now())
  on conflict (store_id, phone) do update set
    name = excluded.name, city = excluded.city, address = excluded.address,
    orders_count = c.orders_count + 1, total_spent = c.total_spent + excluded.total_spent, last_order_at = now()
  returning id into cust_id;

  insert into public.orders (store_id, customer_id, customer_name, phone, city, address, notes, items, total, source)
  values (p_store, cust_id, p_customer->>'name', p_customer->>'phone', p_customer->>'city', p_customer->>'address',
          p_note, v_lines, v_total, p_source)
  returning id, number into ord;

  insert into public.order_events (order_id, store_id, message)
  values (ord.id, p_store, case when p_source = 'manual' then 'تم إنشاء الطلب يدوياً' else 'وصل الطلب من المتجر' end);

  return jsonb_build_object('id', ord.id, 'number', ord.number, 'total', v_total, 'items', v_lines);
end $$;

-- Cancelling puts the items back in stock (if asked) and updates the customer's total.
create or replace function public.cancel_order(p_order uuid, p_store uuid, p_restock boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  o public.orders%rowtype;
  line jsonb;
  prod public.products%rowtype;
  v_idx int;
  v_stock int;
begin
  select * into o from public.orders where id = p_order and store_id = p_store for update;
  if not found or o.status = 'cancelled' then return; end if;

  if p_restock then
    for line in select * from jsonb_array_elements(o.items) loop
      select * into prod from public.products where id = (line->>'productId')::uuid and store_id = p_store for update;
      continue when not found;
      if line->>'variantId' is not null then
        select e.idx - 1, (e.value->>'stock')::int into v_idx, v_stock
          from jsonb_array_elements(prod.variants) with ordinality as e(value, idx)
          where e.value->>'id' = line->>'variantId';
        if v_idx is not null and v_stock is not null then
          update public.products set variants = jsonb_set(variants, array[v_idx::text, 'stock'], to_jsonb(v_stock + (line->>'qty')::int))
            where id = prod.id;
        end if;
      elsif prod.stock is not null then
        update public.products set stock = stock + (line->>'qty')::int where id = prod.id;
      end if;
    end loop;
  end if;

  update public.orders set status = 'cancelled' where id = o.id;
  if o.customer_id is not null then
    update public.customers set total_spent = greatest(0, total_spent - o.total) where id = o.customer_id;
  end if;
  insert into public.order_events (order_id, store_id, message)
  values (o.id, p_store, case when p_restock then 'تم إلغاء الطلب وإرجاع الكميات للمخزون' else 'تم إلغاء الطلب' end);
end $$;

revoke all on function public.place_order(uuid, jsonb, jsonb, text, text) from public, anon, authenticated;
revoke all on function public.cancel_order(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public.place_order(uuid, jsonb, jsonb, text, text) to service_role;
grant execute on function public.cancel_order(uuid, uuid, boolean) to service_role;
