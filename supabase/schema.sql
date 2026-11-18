-- Stora database schema. Paste all of this into Supabase: SQL Editor > New query > Run.
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
  check (slug not in ('www', 'app', 'admin', 'api', 'dashboard', 'mail', 'help', 'support', 'blog', 's'));

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

-- Merchants may not change billing fields themselves; only the platform (service role) can.
create or replace function public.protect_billing_fields() returns trigger language plpgsql as $$
begin
  if auth.role() <> 'service_role' then
    new.status := old.status;
    new.plan := old.plan;
    new.paid_until := old.paid_until;
    new.custom_domain_verified := old.custom_domain_verified;
  end if;
  return new;
end $$;
create trigger stores_protect_billing before update on public.stores
  for each row execute function public.protect_billing_fields();

-- Shoppers never insert orders directly: the website does it on the server
-- after checking real prices, using the service role key.

-- Shoppers only get the columns a storefront needs (no owner id, no billing info).
revoke select on public.stores from anon;
grant select (id, slug, name, tagline, logo_url, whatsapp, city, currency, theme, primary_color,
  sections, delivery_note, custom_domain, custom_domain_verified, status) on public.stores to anon;
