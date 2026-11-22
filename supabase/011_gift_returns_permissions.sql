-- Nama update 011: gift orders, returns / refunds / exchanges, staff permissions per tab.
-- Run once in Supabase: SQL Editor > New query > Run. Safe to run again.

-- ───────────── Gift orders ─────────────
alter table public.orders add column if not exists gift jsonb;  -- { to_name, to_phone, message, hide_prices }

-- ───────────── Returns, refunds, exchanges ─────────────
alter table public.orders add column if not exists refunded numeric(12,2) not null default 0;
alter table public.orders drop constraint if exists orders_payment_status_check;
alter table public.orders add constraint orders_payment_status_check
  check (payment_status in ('pending', 'paid', 'partially_refunded', 'refunded'));

create table if not exists public.order_returns (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  kind text not null check (kind in ('refund', 'exchange')),
  items jsonb not null default '[]'::jsonb,      -- lines given back: [{productId, variantId, title, variantTitle, price, qty}]
  new_items jsonb not null default '[]'::jsonb,  -- exchange lines given out instead
  restocked boolean not null default true,
  refund_amount numeric(12,2) not null default 0 check (refund_amount >= 0),  -- money back to the customer
  extra_charge numeric(12,2) not null default 0 check (extra_charge >= 0),    -- customer paid more (exchange)
  method text,
  reason text,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists order_returns_order on public.order_returns(order_id);
create index if not exists order_returns_store on public.order_returns(store_id, created_at desc);
alter table public.order_returns enable row level security;
grant all on public.order_returns to service_role;
grant select on public.order_returns to authenticated;
drop policy if exists "owner reads returns" on public.order_returns;
create policy "owner reads returns" on public.order_returns
  for select to authenticated using (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));

-- Puts returned items back in stock, takes exchange items out, records the money. All or nothing.
create or replace function public.process_return(
  p_order uuid, p_store uuid, p_kind text, p_items jsonb, p_new_items jsonb,
  p_restock boolean, p_refund numeric, p_extra numeric, p_method text, p_reason text, p_user uuid
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  o public.orders%rowtype;
  line jsonb;
  prod public.products%rowtype;
  v jsonb;
  v_idx int;
  v_stock int;
  v_qty int;
  v_ordered int;
  v_before int;
  v_back jsonb := '[]'::jsonb;
  v_out jsonb := '[]'::jsonb;
  v_refund numeric := round(greatest(coalesce(p_refund, 0), 0), 2);
  v_extra numeric := round(greatest(coalesce(p_extra, 0), 0), 2);
  v_id uuid;
  v_msg text;
begin
  if p_kind not in ('refund', 'exchange') then raise exception 'BAD_KIND'; end if;
  select * into o from public.orders where id = p_order and store_id = p_store for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if o.status = 'cancelled' then raise exception 'ORDER_CANCELLED'; end if;

  -- Items coming back: only what was ordered and not already returned.
  for line in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    v_qty := (line->>'qty')::int;
    continue when v_qty is null or v_qty <= 0;
    select coalesce(sum((e->>'qty')::int), 0) into v_ordered from jsonb_array_elements(o.items) e
      where e->>'productId' = line->>'productId' and coalesce(e->>'variantId', '') = coalesce(line->>'variantId', '');
    select coalesce(sum((x->>'qty')::int), 0) into v_before
      from public.order_returns r, jsonb_array_elements(r.items) x
      where r.order_id = o.id and x->>'productId' = line->>'productId' and coalesce(x->>'variantId', '') = coalesce(line->>'variantId', '');
    if v_ordered = 0 or v_qty > v_ordered - v_before then raise exception 'TOO_MANY_RETURNED'; end if;
    v_back := v_back || jsonb_build_array((
      select e || jsonb_build_object('qty', v_qty) from jsonb_array_elements(o.items) e
      where e->>'productId' = line->>'productId' and coalesce(e->>'variantId', '') = coalesce(line->>'variantId', '') limit 1));

    if p_restock then
      select * into prod from public.products where id = (line->>'productId')::uuid and store_id = p_store for update;
      if found then
        if line->>'variantId' is not null then
          select e.idx - 1, (e.value->>'stock')::int into v_idx, v_stock
            from jsonb_array_elements(prod.variants) with ordinality as e(value, idx) where e.value->>'id' = line->>'variantId';
          if v_idx is not null and v_stock is not null then
            update public.products set variants = jsonb_set(variants, array[v_idx::text, 'stock'], to_jsonb(v_stock + v_qty)) where id = prod.id;
          end if;
        elsif prod.stock is not null then
          update public.products set stock = stock + v_qty where id = prod.id;
        end if;
      end if;
    end if;
  end loop;

  -- Exchange: items going out to the customer instead, at today's price, from stock.
  if p_kind = 'exchange' then
    for line in select * from jsonb_array_elements(coalesce(p_new_items, '[]'::jsonb)) loop
      v_qty := (line->>'qty')::int;
      continue when v_qty is null or v_qty <= 0;
      select * into prod from public.products where id = (line->>'productId')::uuid and store_id = p_store for update;
      if not found then raise exception 'PRODUCT_NOT_FOUND'; end if;
      if line->>'variantId' is not null then
        select e.idx - 1, e.value into v_idx, v
          from jsonb_array_elements(prod.variants) with ordinality as e(value, idx) where e.value->>'id' = line->>'variantId';
        if v_idx is null then raise exception 'VARIANT_REQUIRED:%', prod.title; end if;
        v_stock := (v->>'stock')::int;
        if v_stock is not null then
          if v_stock < v_qty then raise exception 'OUT_OF_STOCK:% (%)', prod.title, v->>'title'; end if;
          update public.products set variants = jsonb_set(variants, array[v_idx::text, 'stock'], to_jsonb(v_stock - v_qty)) where id = prod.id;
        end if;
        v_out := v_out || jsonb_build_array(jsonb_build_object('productId', prod.id, 'variantId', v->>'id', 'title', prod.title,
          'variantTitle', v->>'title', 'price', coalesce((v->>'price')::numeric, prod.price), 'qty', v_qty));
      else
        if jsonb_array_length(coalesce(prod.variants, '[]'::jsonb)) > 0 then raise exception 'VARIANT_REQUIRED:%', prod.title; end if;
        if prod.stock is not null then
          if prod.stock < v_qty then raise exception 'OUT_OF_STOCK:%', prod.title; end if;
          update public.products set stock = stock - v_qty where id = prod.id;
        end if;
        v_out := v_out || jsonb_build_array(jsonb_build_object('productId', prod.id, 'title', prod.title, 'price', prod.price, 'qty', v_qty));
      end if;
    end loop;
  end if;

  if jsonb_array_length(v_back) = 0 and jsonb_array_length(v_out) = 0 and v_refund = 0 and v_extra = 0 then raise exception 'NOTHING_TO_DO'; end if;
  if v_refund > o.total + v_extra - o.refunded then raise exception 'REFUND_TOO_BIG'; end if;

  insert into public.order_returns (store_id, order_id, kind, items, new_items, restocked, refund_amount, extra_charge, method, reason, created_by)
  values (p_store, o.id, p_kind, v_back, v_out, p_restock, v_refund, v_extra, nullif(trim(p_method), ''), nullif(trim(p_reason), ''), p_user)
  returning id into v_id;

  update public.orders set
    refunded = refunded + v_refund,
    payment_status = case
      when v_refund = 0 then payment_status
      when refunded + v_refund >= total + v_extra then 'refunded'
      else 'partially_refunded' end
  where id = o.id;
  if o.customer_id is not null then
    update public.customers set total_spent = greatest(0, total_spent - v_refund + v_extra) where id = o.customer_id;
  end if;

  v_msg := case when p_kind = 'exchange' then 'تبديل: ' else 'استرجاع: ' end
    || coalesce((select string_agg((x->>'title') || ' × ' || (x->>'qty'), '، ') from jsonb_array_elements(v_back) x), '')
    || case when jsonb_array_length(v_out) > 0 then ' ← ' || (select string_agg((x->>'title') || ' × ' || (x->>'qty'), '، ') from jsonb_array_elements(v_out) x) else '' end
    || case when v_refund > 0 then '. رجعنا للزبون ' || v_refund else '' end
    || case when v_extra > 0 then '. الزبون دفع زيادة ' || v_extra else '' end
    || case when p_restock and jsonb_array_length(v_back) > 0 then '. رجعت القطع للمخزون' else '' end;
  insert into public.order_events (order_id, store_id, message) values (o.id, p_store, v_msg);
  return v_id;
end $$;
revoke all on function public.process_return(uuid, uuid, text, jsonb, jsonb, boolean, numeric, numeric, text, text, uuid) from public, anon, authenticated;
grant execute on function public.process_return(uuid, uuid, text, jsonb, jsonb, boolean, numeric, numeric, text, text, uuid) to service_role;

-- ───────────── Staff permissions per tab ─────────────
-- orders, quotes, products, customers, discounts, analytics, design. Settings stay with the owner.
alter table public.store_staff
  add column if not exists permissions text[] not null default array['orders', 'quotes', 'products', 'customers'];

create or replace function public.staff_can(p_store uuid, variadic p_perms text[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.store_staff st
                 where st.store_id = p_store and st.user_id = auth.uid() and st.permissions && p_perms)
$$;
grant execute on function public.staff_can(uuid, text[]) to authenticated;

drop policy if exists "staff manages products" on public.products;
drop policy if exists "staff reads products" on public.products;
create policy "staff reads products" on public.products
  for select to authenticated using (public.staff_can(store_id, 'products', 'orders', 'quotes'));
drop policy if exists "staff writes products" on public.products;
create policy "staff writes products" on public.products
  for all to authenticated using (public.staff_can(store_id, 'products')) with check (public.staff_can(store_id, 'products'));

drop policy if exists "staff manages collections" on public.collections;
create policy "staff manages collections" on public.collections
  for all to authenticated using (public.staff_can(store_id, 'products')) with check (public.staff_can(store_id, 'products'));

drop policy if exists "staff reads orders" on public.orders;
create policy "staff reads orders" on public.orders
  for select to authenticated using (public.staff_can(store_id, 'orders', 'customers', 'analytics'));
drop policy if exists "staff updates orders" on public.orders;
create policy "staff updates orders" on public.orders
  for update to authenticated using (public.staff_can(store_id, 'orders'));

drop policy if exists "staff reads customers" on public.customers;
create policy "staff reads customers" on public.customers
  for select to authenticated using (public.staff_can(store_id, 'customers', 'orders', 'analytics', 'quotes'));
drop policy if exists "staff updates customers" on public.customers;
create policy "staff updates customers" on public.customers
  for update to authenticated using (public.staff_can(store_id, 'customers', 'orders'));

drop policy if exists "staff reads order events" on public.order_events;
create policy "staff reads order events" on public.order_events
  for select to authenticated using (public.staff_can(store_id, 'orders'));
drop policy if exists "staff adds order events" on public.order_events;
create policy "staff adds order events" on public.order_events
  for insert to authenticated
  with check (public.staff_can(store_id, 'orders') and exists (select 1 from public.orders o where o.id = order_id and o.store_id = order_events.store_id));

drop policy if exists "staff reads stats" on public.store_stats;
create policy "staff reads stats" on public.store_stats
  for select to authenticated using (public.staff_can(store_id, 'analytics'));

drop policy if exists "staff manages quotes" on public.quotes;
create policy "staff manages quotes" on public.quotes
  for all to authenticated using (public.staff_can(store_id, 'quotes')) with check (public.staff_can(store_id, 'quotes'));

drop policy if exists "staff manages discounts" on public.discounts;
create policy "staff manages discounts" on public.discounts
  for all to authenticated using (public.staff_can(store_id, 'discounts')) with check (public.staff_can(store_id, 'discounts'));

drop policy if exists "staff reads returns" on public.order_returns;
create policy "staff reads returns" on public.order_returns
  for select to authenticated using (public.staff_can(store_id, 'orders'));
-- "design" (look, pages, menus) is saved by the server after checking the permission, so staff
-- never get direct write access to the store's settings (payments, WhatsApp, plan).
