-- Nama: full database setup for a NEW Supabase project (all files in order).
-- Paste everything into SQL Editor and press Run once.

-- ================= schema.sql =================
-- TamKar database schema. Paste all of this into Supabase: SQL Editor > New query > Run.
-- Safe to run once on a new project.


-- ───────────── Stores ─────────────
create table public.stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  name text not null check (char_length(name) between 2 and 80),
  tagline text,
  logo_url text,
  whatsapp text not null check (whatsapp ~ '^[0-9]{9,15}$'),
  city text,
  currency text not null default 'USD' check (currency in ('USD', 'SYP')),
  theme text not null default 'classic' check (theme in ('classic', 'bold', 'soft')),
  primary_color text check (primary_color ~ '^#[0-9a-fA-F]{6}$'),
  sections jsonb not null default '[]'::jsonb,
  delivery_note text,
  custom_domain text unique,
  custom_domain_verified boolean not null default false,
  status text not null default 'active' check (status in ('active', 'suspended')),
  plan text not null default 'trial',
  paid_until date,
  created_at timestamptz not null default now()
);

-- Reserved subdomains nobody can take
alter table public.stores add constraint slug_not_reserved
  check (slug not in ('www', 'app', 'admin', 'api', 'dashboard', 'mail', 'help', 'support', 'blog', 's',
    'login', 'signup', 'tamkar', 'demo', 'lamar', 'halawet', 'test', 'shop', 'store'));

-- ───────────── Products ─────────────
create table public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  description text,
  price numeric(14, 2) not null check (price >= 0),
  compare_at_price numeric(14, 2) check (compare_at_price >= 0),
  images text[] not null default '{}',
  category text,
  stock integer check (stock >= 0), -- null means unlimited
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index products_store_idx on public.products (store_id, active, created_at desc);

-- ───────────── Orders ─────────────
create sequence public.order_number_seq start 1001;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  number bigint not null default nextval('public.order_number_seq'),
  store_id uuid not null references public.stores(id) on delete cascade,
  customer_name text not null,
  phone text not null,
  city text not null,
  address text not null,
  notes text,
  items jsonb not null,
  total numeric(14, 2) not null,
  status text not null default 'new' check (status in ('new', 'confirmed', 'delivered', 'cancelled')),
  created_at timestamptz not null default now()
);
create index orders_store_idx on public.orders (store_id, created_at desc);

-- ───────────── Table access ─────────────
-- Newer Supabase projects do not open new tables automatically, so we grant access here.
-- Row Level Security below still decides which rows each person can see.
grant usage on schema public to anon, authenticated, service_role;
grant all on public.stores, public.products, public.orders to service_role;
grant usage, select on sequence public.order_number_seq to service_role;
grant select, insert, update, delete on public.stores, public.products to authenticated;
grant select, update on public.orders to authenticated;
grant select on public.products to anon;

-- ───────────── Store isolation (Row Level Security) ─────────────
-- Every table is locked by default. These rules decide who sees what.
alter table public.stores enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;

-- Shoppers (anyone) can see active stores and their active products.
create policy "public reads active stores" on public.stores
  for select using (status = 'active');
create policy "public reads active products" on public.products
  for select using (
    active and exists (select 1 from public.stores s where s.id = store_id and s.status = 'active')
  );

-- Merchants can only see and change their own store, products and orders.
create policy "owner manages own store" on public.stores
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner manages own products" on public.products
  for all to authenticated using (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));
create policy "owner reads own orders" on public.orders
  for select to authenticated using (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));
create policy "owner updates own orders" on public.orders
  for update to authenticated using (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));

-- Merchants may not change billing, address or domain fields themselves; only the platform (service role) can.
create or replace function public.protect_store_fields() returns trigger language plpgsql as $$
begin
  if auth.role() <> 'service_role' then
    if tg_op = 'INSERT' then
      new.status := 'active';
      new.plan := 'trial';
      new.paid_until := null;
      new.custom_domain := null;
      new.custom_domain_verified := false;
    else
      new.owner_id := old.owner_id;
      new.slug := old.slug;
      new.status := old.status;
      new.plan := old.plan;
      new.paid_until := old.paid_until;
      new.custom_domain := old.custom_domain;
      new.custom_domain_verified := old.custom_domain_verified;
    end if;
  end if;
  return new;
end $$;
create trigger stores_protect_fields before insert or update on public.stores
  for each row execute function public.protect_store_fields();

-- Shoppers never insert orders directly: the website does it on the server
-- after checking real prices, using the service role key.

-- Shoppers only get the columns a storefront needs (no owner id, no billing info).
revoke select on public.stores from anon;
grant select (id, slug, name, tagline, logo_url, whatsapp, city, currency, theme, primary_color,
  sections, delivery_note, custom_domain, custom_domain_verified, status) on public.stores to anon;

-- ───────────── Image storage ─────────────
-- Private bucket: images are served through the website (/api/media/...), never directly.
insert into storage.buckets (id, name, public) values ('media', 'media', false)
on conflict (id) do nothing;

-- ================= 002_store_management.sql =================
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

-- ================= 003_selling_marketing.sql =================
-- TamKar update 003: discounts, delivery fees by city, store analytics, Meta Pixel.
-- Run once in Supabase: SQL Editor > New query > Run.

-- ───────────── Store settings ─────────────
alter table public.stores
  add column if not exists shipping jsonb not null default '{}'::jsonb,  -- { "default_fee": 2, "free_over": 50, "rates": [{ "city": "دمشق", "fee": 1 }] }
  add column if not exists meta_pixel_id text check (meta_pixel_id ~ '^[0-9]{5,20}$'),
  add column if not exists meta_capi_token text;                          -- secret, never shown to shoppers

grant select (shipping, meta_pixel_id) on public.stores to anon;

-- ───────────── Orders: price breakdown ─────────────
alter table public.orders
  add column if not exists subtotal numeric(14, 2),
  add column if not exists discount_code text,
  add column if not exists discount_amount numeric(14, 2) not null default 0,
  add column if not exists shipping_fee numeric(14, 2) not null default 0;
update public.orders set subtotal = total where subtotal is null;

-- ───────────── Discounts ─────────────
create table if not exists public.discounts (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  code text,                                         -- null for automatic discounts
  title text not null,
  kind text not null check (kind in ('percent', 'fixed', 'free_shipping')),
  value numeric(14, 2) not null default 0 check (value >= 0),
  min_subtotal numeric(14, 2) check (min_subtotal >= 0),
  automatic boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  usage_limit integer check (usage_limit > 0),
  used_count integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (automatic or code is not null),
  check (kind <> 'percent' or value <= 100)
);
create unique index if not exists discounts_code_idx on public.discounts (store_id, lower(code)) where code is not null;

alter table public.discounts enable row level security;
grant all on public.discounts to service_role;
grant select, insert, update, delete on public.discounts to authenticated;
create policy "owner manages own discounts" on public.discounts
  for all to authenticated
  using (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));

-- ───────────── Analytics (daily counters) ─────────────
create table if not exists public.store_stats (
  store_id uuid not null references public.stores(id) on delete cascade,
  day date not null,
  page_views integer not null default 0,
  sessions integer not null default 0,
  product_views integer not null default 0,
  add_to_carts integer not null default 0,
  checkouts integer not null default 0,
  primary key (store_id, day)
);
alter table public.store_stats enable row level security;
grant all on public.store_stats to service_role;
grant select on public.store_stats to authenticated;
create policy "owner reads own stats" on public.store_stats
  for select to authenticated using (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));

create or replace function public.track_event(p_store uuid, p_kind text, p_new_session boolean)
returns void language plpgsql security definer set search_path = public as $$
declare d date := (now() at time zone 'Asia/Damascus')::date;
begin
  insert into public.store_stats as s (store_id, day, page_views, sessions, product_views, add_to_carts, checkouts)
  values (p_store, d,
          case when p_kind in ('page', 'product') then 1 else 0 end,
          case when p_new_session then 1 else 0 end,
          case when p_kind = 'product' then 1 else 0 end,
          case when p_kind = 'cart' then 1 else 0 end,
          case when p_kind = 'checkout' then 1 else 0 end)
  on conflict (store_id, day) do update set
    page_views = s.page_views + excluded.page_views,
    sessions = s.sessions + excluded.sessions,
    product_views = s.product_views + excluded.product_views,
    add_to_carts = s.add_to_carts + excluded.add_to_carts,
    checkouts = s.checkouts + excluded.checkouts;
end $$;

-- ───────────── Pricing: discount + delivery fee ─────────────
-- Used for the cart preview (p_use = false) and when the order is saved (p_use = true,
-- which also counts the discount as used). One set of rules for both.
create or replace function public.order_pricing(p_store uuid, p_subtotal numeric, p_city text, p_code text, p_use boolean)
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

  -- Delivery fee: the city's rate, otherwise the default fee.
  fee := coalesce((ship->>'default_fee')::numeric, 0);
  for rate in select * from jsonb_array_elements(coalesce(ship->'rates', '[]'::jsonb)) loop
    if trim(rate->>'city') = trim(coalesce(p_city, '')) then fee := coalesce((rate->>'fee')::numeric, fee); end if;
  end loop;

  if nullif(trim(coalesce(p_code, '')), '') is not null then
    select * into d from public.discounts
      where store_id = p_store and lower(code) = lower(trim(p_code)) and active and not automatic
      for update;
    if not found then raise exception 'BAD_CODE'; end if;
    if (d.starts_at is not null and d.starts_at > now()) or (d.ends_at is not null and d.ends_at <= now()) then raise exception 'CODE_EXPIRED'; end if;
    if d.usage_limit is not null and d.used_count >= d.usage_limit then raise exception 'CODE_USED_UP'; end if;
    if d.min_subtotal is not null and p_subtotal < d.min_subtotal then raise exception 'CODE_MIN:%', d.min_subtotal; end if;
    best := d;
  else
    -- Best automatic discount that applies.
    for d in select * from public.discounts
      where store_id = p_store and automatic and active
        and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now())
        and (usage_limit is null or used_count < usage_limit)
        and (min_subtotal is null or p_subtotal >= min_subtotal)
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

-- ───────────── Placing an order (now with discounts and delivery fee) ─────────────
drop function if exists public.place_order(uuid, jsonb, jsonb, text, text);
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

  -- Discounts and delivery fee (same rules as the cart preview).
  pricing := public.order_pricing(p_store, v_total, p_customer->>'city', p_discount_code, true);
  v_grand := v_total - (pricing->>'discount')::numeric + (pricing->>'shipping')::numeric;

  insert into public.customers as c (store_id, name, phone, city, address, orders_count, total_spent, last_order_at)
  values (p_store, p_customer->>'name', p_customer->>'phone', p_customer->>'city', p_customer->>'address', 1, v_grand, now())
  on conflict (store_id, phone) do update set
    name = excluded.name, city = excluded.city, address = excluded.address,
    orders_count = c.orders_count + 1, total_spent = c.total_spent + excluded.total_spent, last_order_at = now()
  returning id into cust_id;

  insert into public.orders (store_id, customer_id, customer_name, phone, city, address, notes, items, total, source,
                             subtotal, discount_code, discount_amount, shipping_fee)
  values (p_store, cust_id, p_customer->>'name', p_customer->>'phone', p_customer->>'city', p_customer->>'address',
          p_note, v_lines, v_grand, p_source,
          v_total, pricing->>'code', (pricing->>'discount')::numeric, (pricing->>'shipping')::numeric)
  returning id, number into ord;

  insert into public.order_events (order_id, store_id, message)
  values (ord.id, p_store, case when p_source = 'manual' then 'تم إنشاء الطلب يدوياً' else 'وصل الطلب من المتجر' end);

  return jsonb_build_object('id', ord.id, 'number', ord.number, 'total', v_grand, 'subtotal', v_total,
    'discount', (pricing->>'discount')::numeric, 'discount_code', pricing->>'code', 'shipping', (pricing->>'shipping')::numeric,
    'items', v_lines);
end $$;

revoke all on function public.place_order(uuid, jsonb, jsonb, text, text, text) from public, anon, authenticated;
revoke all on function public.order_pricing(uuid, numeric, text, text, boolean) from public, anon, authenticated;
revoke all on function public.track_event(uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.place_order(uuid, jsonb, jsonb, text, text, text) to service_role;
grant execute on function public.order_pricing(uuid, numeric, text, text, boolean) to service_role;
grant execute on function public.track_event(uuid, text, boolean) to service_role;

-- ================= 004_platform_admin.sql =================
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

-- ================= 005_store_design.sql =================
-- TamKar update 005: product specs, store pages, menus, SEO and social links.
-- Run once in Supabase: SQL Editor > New query > Run.

alter table public.products
  add column if not exists specs jsonb not null default '[]'::jsonb;   -- [{ "name": "الشاشة", "value": "6.1 إنش" }]

alter table public.stores
  add column if not exists menus jsonb not null default '{}'::jsonb,   -- { "header": [{ "label", "href" }], "footer": [...] }
  add column if not exists seo jsonb not null default '{}'::jsonb,     -- { "title", "description", "image" }
  add column if not exists social jsonb not null default '{}'::jsonb;  -- { "instagram", "facebook", "tiktok", "telegram" }

grant select (menus, seo, social, business_type) on public.stores to anon;

-- ───────────── Store pages (about us, returns policy...) ─────────────
create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  handle text not null check (handle ~ '^[a-z0-9-]{1,60}$'),
  body text not null default '',
  published boolean not null default true,
  created_at timestamptz not null default now(),
  unique (store_id, handle)
);
alter table public.pages enable row level security;
grant all on public.pages to service_role;
grant select, insert, update, delete on public.pages to authenticated;
grant select on public.pages to anon;

drop policy if exists "public reads published pages" on public.pages;
drop policy if exists "owner manages own pages" on public.pages;
create policy "public reads published pages" on public.pages
  for select using (published and exists (select 1 from public.stores s where s.id = store_id and s.status = 'active'));
create policy "owner manages own pages" on public.pages
  for all to authenticated
  using (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));

-- ================= 006_pickup.sql =================
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

-- ================= 007_pro.sql =================
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

-- ================= 008_quotes.sql =================
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
