-- Kun update 012: automatic Meta connection run from the platform's own Meta business account.
-- Two options per store:
--   manual  = the merchant pastes their own Pixel ID and token (Settings > Advanced > Meta)
--   managed = the Kun team creates the pixel and catalog for the store inside the Kun business account
-- Run once in Supabase: SQL Editor > New query > Run. Safe to run again.

create table if not exists public.store_meta (
  store_id uuid primary key references public.stores(id) on delete cascade,
  mode text not null default 'manual' check (mode in ('manual', 'managed')),
  status text not null default 'off' check (status in ('off', 'requested', 'active', 'stopped')),
  requested_at timestamptz,      -- merchant asked the Kun team to connect Meta
  page_url text,                 -- merchant's Facebook page / Instagram, for the partner request
  pixel_id text,                 -- kept after stopping, so the same pixel (and its history) is reused if the store comes back
  catalog_id text,
  feed_id text,
  product_sets jsonb not null default '{}'::jsonb,  -- { collection title: product set id }
  activated_at timestamptz,
  stopped_at timestamptz,
  last_sync_at timestamptz,
  last_error text,
  updated_at timestamptz not null default now()
);

-- Only the server (service role) reads and writes this table: it holds the platform's Meta asset ids.
alter table public.store_meta enable row level security;
