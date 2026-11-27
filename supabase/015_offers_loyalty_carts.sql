-- Kun update 015: quantity offers, abandoned carts, loyalty points, order confirmation.
-- Run once in Supabase: SQL Editor > New query > paste > Run. Safe to run again.
-- Needs updates 013 and 014 first.

-- 1) Quantity offers: per product, e.g. [{"min": 3, "off": 10}] = 10% off each piece from 3 pieces.
alter table public.products add column if not exists qty_prices jsonb not null default '[]'::jsonb;

-- place_order: same as update 006, plus the quantity offer on each line.
create or replace function public.place_order(
  p_store uuid, p_customer jsonb, p_items jsonb, p_source text default 'online', p_note text default null,
  p_discount_code text default null
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
  pricing jsonb;
  v_grand numeric;
  v_pickup boolean := coalesce(p_customer->>'method', 'pickup') = 'pickup';
  v_pq jsonb := '{}'::jsonb;  -- quantity of each product in the order (all its variants together)
  v_list numeric;
  v_off numeric;
begin
  if p_source not in ('online', 'manual') then raise exception 'BAD_SOURCE'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'EMPTY'; end if;

  -- Quantity offers count every variant of a product together (2 red + 1 blue = 3).
  select coalesce(jsonb_object_agg(pid, q), '{}'::jsonb) into v_pq
    from (select e->>'productId' pid, sum(greatest(coalesce((e->>'qty')::int, 0), 0)) q
          from jsonb_array_elements(p_items) e group by 1) t;

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

    -- Quantity offer: the biggest discount whose minimum the order reaches.
    v_list := v_price;
    select max((t->>'off')::numeric) into v_off
      from jsonb_array_elements(coalesce(prod.qty_prices, '[]'::jsonb)) t
      where (t->>'min')::int <= coalesce((v_pq->>prod.id::text)::int, v_qty)
        and (t->>'off')::numeric > 0 and (t->>'off')::numeric < 100;
    if v_off is not null then
      v_price := round(v_list * (100 - v_off) / 100, 2);
    end if;

    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'productId', prod.id, 'variantId', v->>'id', 'title', prod.title, 'variantTitle', v->>'title',
      'price', v_price, 'qty', v_qty, 'image', prod.images[1])
      || case when v_off is not null then jsonb_build_object('listPrice', v_list, 'offer', v_off) else '{}'::jsonb end);
    v_total := v_total + v_price * v_qty;
  end loop;

  pricing := public.order_pricing(p_store, v_total, p_customer->>'city', p_discount_code, true, v_pickup);
  v_grand := v_total - (pricing->>'discount')::numeric + (pricing->>'shipping')::numeric;

  insert into public.customers as c (store_id, name, phone, city, address, orders_count, total_spent, last_order_at)
  values (p_store, p_customer->>'name', p_customer->>'phone', nullif(p_customer->>'city', ''), nullif(p_customer->>'address', ''), 1, v_grand, now())
  on conflict (store_id, phone) do update set
    name = excluded.name,
    city = coalesce(excluded.city, c.city),
    address = coalesce(excluded.address, c.address),
    orders_count = c.orders_count + 1, total_spent = c.total_spent + excluded.total_spent, last_order_at = now()
  returning id into cust_id;

  insert into public.orders (store_id, customer_id, customer_name, phone, city, address, notes, items, total, source,
                             subtotal, discount_code, discount_amount, shipping_fee, fulfillment)
  values (p_store, cust_id, p_customer->>'name', p_customer->>'phone', nullif(p_customer->>'city', ''), nullif(p_customer->>'address', ''),
          p_note, v_lines, v_grand, p_source,
          v_total, pricing->>'code', (pricing->>'discount')::numeric, (pricing->>'shipping')::numeric,
          case when v_pickup then 'pickup' else 'delivery' end)
  returning id, number into ord;

  insert into public.order_events (order_id, store_id, message)
  values (ord.id, p_store, case when p_source = 'manual' then 'تم إنشاء الطلب يدوياً' else 'وصل الطلب من المتجر' end
                           || case when v_pickup then ' (استلام من المحل)' else ' (توصيل)' end);

  return jsonb_build_object('id', ord.id, 'number', ord.number, 'total', v_grand, 'subtotal', v_total,
    'discount', (pricing->>'discount')::numeric, 'discount_code', pricing->>'code', 'shipping', (pricing->>'shipping')::numeric,
    'items', v_lines, 'fulfillment', case when v_pickup then 'pickup' else 'delivery' end);
end $$;

revoke all on function public.place_order(uuid, jsonb, jsonb, text, text, text) from public, anon, authenticated;
revoke all on function public.order_pricing(uuid, numeric, text, text, boolean, boolean) from public, anon, authenticated;
grant execute on function public.place_order(uuid, jsonb, jsonb, text, text, text) to service_role;
grant execute on function public.order_pricing(uuid, numeric, text, text, boolean, boolean) to service_role;

-- 2) Abandoned carts: a customer typed their phone at checkout but did not finish.
create table if not exists public.abandoned_carts (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  phone text not null,
  name text,
  items jsonb not null default '[]'::jsonb,   -- [{productId, variantId, qty, title, price}]
  subtotal numeric(14,2) not null default 0,
  reminded_at timestamptz,
  recovered_order_id uuid references public.orders(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, phone)
);
create index if not exists abandoned_carts_store on public.abandoned_carts(store_id, updated_at desc);
alter table public.abandoned_carts enable row level security;
grant all on public.abandoned_carts to service_role;

-- 3) Loyalty points ledger: + when an order is delivered, - when points become a discount code.
create table if not exists public.loyalty_points (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  phone text not null,
  points integer not null check (points <> 0),
  order_id uuid references public.orders(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists loyalty_points_customer on public.loyalty_points(store_id, phone);
-- An order earns points once.
create unique index if not exists loyalty_points_earn_once on public.loyalty_points(order_id) where points > 0;
alter table public.loyalty_points enable row level security;
grant all on public.loyalty_points to service_role;

-- 4) Order confirmation: did the customer send the order on WhatsApp?
--    null = older order (unknown), 'pending' = not yet, 'sent' = the customer opened WhatsApp.
alter table public.orders add column if not exists wa_status text check (wa_status in ('pending', 'sent'));
