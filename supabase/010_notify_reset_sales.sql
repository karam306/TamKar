-- Nama update 010: Telegram order alerts, "forgot password" codes, salesmen and how merchants heard about us.
-- Run once in Supabase: SQL Editor > New query > Run. Safe to run again.
-- Everything here is private to the platform (service role); merchants and visitors cannot read it.

create table if not exists public.salesmen (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9]{3,12}$'),
  name text not null check (char_length(name) between 2 and 80),
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.salesmen enable row level security;
grant all on public.salesmen to service_role;

alter table public.store_admin
  add column if not exists salesman_id uuid references public.salesmen(id) on delete set null,
  add column if not exists heard_from text,
  add column if not exists telegram_chat_id text,
  add column if not exists telegram_token text unique,
  add column if not exists reset_code_hash text,
  add column if not exists reset_expires timestamptz,
  add column if not exists reset_attempts integer not null default 0;
create index if not exists store_admin_salesman on public.store_admin(salesman_id);
create index if not exists store_admin_telegram on public.store_admin(telegram_chat_id);

-- Finds a store owner by login email (auth.users is not reachable through the API).
create or replace function public.owner_by_email(p_email text)
returns table (user_id uuid, store_id uuid, store_name text)
language sql stable security definer set search_path = public, auth as $$
  select u.id, s.id, s.name
  from auth.users u join public.stores s on s.owner_id = u.id
  where lower(u.email) = lower(trim(p_email))
  limit 1
$$;
revoke all on function public.owner_by_email(text) from public, anon, authenticated;
grant execute on function public.owner_by_email(text) to service_role;
