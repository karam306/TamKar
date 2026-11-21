-- TamKar update 006: pickup from the shop is the default, delivery is optional.
-- Run once in Supabase: SQL Editor > New query > Run. Safe to run again.

-- Stores that already set delivery fees keep delivery on. Everyone else: pickup only.
update public.stores
   set shipping = shipping || jsonb_build_object('delivery', true)
 where not (shipping ? 'delivery')
   and (shipping ? 'default_fee' or jsonb_array_length(coalesce(shipping->'rates', '[]'::jsonb)) > 0);

alter table public.orders
  add column if not exists fulfillment text not null default 'delivery' check (fulfillment in ('pickup', 'delivery'));
alter table public.orders alter column city drop not null, alter column address drop not null;

-- ───────────── Pricing: now knows about pickup ─────────────
drop function if exists public.order_pricing(uuid, numeric, text, text, boolean);
create or replace function public.order_pricing(p_store uuid, p_subtotal numeric, p_city text, p_code text, p_use boolean,
                                                p_pickup boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  ship jsonb;
  d public.discounts%rowtype;
  best public.discounts%rowtype;
  amount numeric := 0;
  best_amount numeric := -1;
  fee numeric := 0;
  rate jsonb;
  free_ship boolean := false;
begin
  select coalesce(shipping, '{}'::jsonb) into ship from public.stores where id = p_store;

  if p_pickup then
    fee := 0;
  else
    if coalesce((ship->>'delivery')::boolean, false) = false then raise exception 'NO_DELIVERY'; end if;
    -- Delivery fee: the city's rate, otherwise the default fee.
    fee := coalesce((ship->>'default_fee')::numeric, 0);
    for rate in select * from jsonb_array_elements(coalesce(ship->'rates', '[]'::jsonb)) loop
      if trim(rate->>'city') = trim(coalesce(p_city, '')) then fee := coalesce((rate->>'fee')::numeric, fee); end if;
    end loop;
  end if;

  if nullif(trim(coalesce(p_code, '')), '') is not null then
    select * into d from public.discounts
      where store_id = p_store and lower(code) = lower(trim(p_code)) and active and not automatic
      for update;
    if not found then raise exception 'BAD_CODE'; end if;
    if (d.starts_at is not null and d.starts_at > now()) or (d.ends_at is not null and d.ends_at <= now()) then raise exception 'CODE_EXPIRED'; end if;
    if d.usage_limit is not null and d.used_count >= d.usage_limit then raise exception 'CODE_USED_UP'; end if;
    if d.min_subtotal is not null and p_subtotal < d.min_subtotal then raise exception 'CODE_MIN:%', d.min_subtotal; end if;
    if d.kind = 'free_shipping' and p_pickup then raise exception 'CODE_DELIVERY_ONLY'; end if;
    best := d;
  else
    -- Best automatic discount that applies (free delivery doesn't count for pickup).
    for d in select * from public.discounts
      where store_id = p_store and automatic and active
        and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now())
        and (usage_limit is null or used_count < usage_limit)
        and (min_subtotal is null or p_subtotal >= min_subtotal)
        and not (kind = 'free_shipping' and p_pickup)
    loop
      amount := case d.kind when 'percent' then round(p_subtotal * d.value / 100, 2)
                            when 'fixed' then least(d.value, p_subtotal)
                            else fee end;
      if amount > best_amount then best := d; best_amount := amount; end if;
    end loop;
  end if;

  amount := 0;
  if best.id is not null then
    if best.kind = 'percent' then amount := round(p_subtotal * best.value / 100, 2);
    elsif best.kind = 'fixed' then amount := least(best.value, p_subtotal);
    else free_ship := true;
    end if;
    if p_use then update public.discounts set used_count = used_count + 1 where id = best.id; end if;
  end if;

  if free_ship or (ship->>'free_over' is not null and p_subtotal - amount >= (ship->>'free_over')::numeric) then
    fee := 0;
  end if;

  return jsonb_build_object('discount', amount, 'shipping', fee, 'code', coalesce(best.code, best.title),
                            'free_shipping', free_ship);
end $$;

-- ───────────── Placing an order: pickup or delivery ─────────────
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
