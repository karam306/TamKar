-- 017: AI features (product from photo, price list from photo, store texts).
-- One row per AI request, to keep each store within its monthly allowance.
create table if not exists public.ai_usage (
  id bigserial primary key,
  store_id uuid not null references public.stores(id) on delete cascade,
  kind text not null check (kind in ('product', 'price_list', 'store')),
  created_at timestamptz not null default now()
);
create index if not exists ai_usage_store_month on public.ai_usage (store_id, created_at);

-- Written and read only by the server (service role). No access from the browser.
alter table public.ai_usage enable row level security;
grant all on public.ai_usage to service_role;
grant usage, select on sequence public.ai_usage_id_seq to service_role;
