-- Kun update 016: the Claude connector (admin access to every store through /api/mcp).
-- Run once in Supabase: SQL Editor > New query > paste > Run. Safe to run again.

-- Keys are stored only as a SHA-256 hash; the key itself is shown once when created.
create table if not exists public.mcp_keys (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  key_hash text not null unique,
  key_hint text not null,            -- last 4 characters, to recognise it in the list
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

-- Every tool call Claude makes: what, on which store, with which input, and whether it worked.
create table if not exists public.mcp_log (
  id bigint generated always as identity primary key,
  key_id uuid references public.mcp_keys(id) on delete set null,
  tool text not null,
  store_id uuid references public.stores(id) on delete set null,
  input jsonb,
  ok boolean not null,
  error text,
  created_at timestamptz not null default now()
);
create index if not exists mcp_log_recent on public.mcp_log(created_at desc);

-- Only the server (service role) touches these tables.
alter table public.mcp_keys enable row level security;
alter table public.mcp_log enable row level security;
grant all on public.mcp_keys to service_role;
grant all on public.mcp_log to service_role;
