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
