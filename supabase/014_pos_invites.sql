-- Kun update 014: selling in the shop (POS) and merchant invites.
-- Run once in Supabase: SQL Editor > New query > paste > Run. Safe to run again.

-- 1) Sales made inside the shop from the "بيع في المحل" screen. Saved as manual orders, marked here
--    so reports can tell shop sales from online orders.
alter table public.orders add column if not exists in_store boolean not null default false;
create index if not exists orders_in_store on public.orders(store_id, created_at desc) where in_store;

-- 2) Merchant invites: a store's invite link (kunstores.com/signup?invite=SLUG).
--    When the invited store pays for the first time, the Kun team grants one free month to both
--    from the admin panel; referral_rewarded_at makes sure it happens once.
alter table public.store_admin
  add column if not exists invited_by uuid references public.stores(id) on delete set null,
  add column if not exists referral_rewarded_at timestamptz;
create index if not exists store_admin_invited_by on public.store_admin(invited_by);
