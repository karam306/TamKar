-- Nama update 009: pay by e-wallet transfer (Sham Cash, Syriatel Cash, MTN Cash).
-- Run once in Supabase: SQL Editor > New query > Run. Safe to run again.
-- Wallet details live in stores.shipping -> payments (no change needed there).

alter table public.orders
  add column if not exists payment_method text not null default 'cod'
  check (payment_method in ('cod', 'sham_cash', 'syriatel_cash', 'mtn_cash'));
