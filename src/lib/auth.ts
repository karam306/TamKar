import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isPro } from "./plans";
import { cache } from "react";
import { hasSupabase, SUPABASE_PUBLIC_KEY, SUPABASE_URL } from "./supabase";
import type { Store } from "./types";

/** Supabase client acting as the signed-in merchant (Row Level Security applies). */
export async function supabaseUser(): Promise<SupabaseClient> {
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Called from a page render: the proxy refreshes the session instead.
        }
      },
    },
  });
}

export type MerchantStore = Store & {
  owner_id: string;
  custom_domain: string | null;
  custom_domain_verified: boolean;
  plan: string;
  paid_until: string | null;
  created_at: string;
};

export type SessionUser = { id: string; email: string | null };
export type Merchant = { user: SessionUser; store: MerchantStore; db: SupabaseClient; role: "owner" | "staff" };

/**
 * Who is signed in. Checks the login token's signature locally (no trip to Supabase)
 * and is remembered for the rest of the request.
 */
export const getSessionUser = cache(async (): Promise<{ user: SessionUser; db: SupabaseClient } | null> => {
  if (!hasSupabase) return null;
  const db = await supabaseUser();
  const { data } = await db.auth.getClaims();
  const c = data?.claims;
  if (!c?.sub) return null;
  return { user: { id: c.sub, email: typeof c.email === "string" ? c.email : null }, db };
});

/** The signed-in merchant and their store, or null. */
export const getMerchant = cache(async (): Promise<Merchant | null> => {
  const session = await getSessionUser();
  if (!session) return null;
  const { user, db } = session;
  const { data: store } = await db.from("stores").select("*").eq("owner_id", user.id).maybeSingle();
  if (store) return { user, store: store as MerchantStore, db, role: "owner" };
  // Staff member of someone else's store (Pro only: on Basic their access pauses).
  const { data: member } = await db.from("store_staff").select("store_id").eq("user_id", user.id).maybeSingle();
  if (!member) return null;
  const { data: shop } = await db.from("stores").select("*").eq("id", member.store_id).maybeSingle();
  if (!shop || !isPro(shop)) return null;
  return { user, store: shop as MerchantStore, db, role: "staff" };
});

/** Use at the top of every dashboard page and action. */
export async function requireMerchant(): Promise<Merchant> {
  const m = await getMerchant();
  if (!m) redirect("/login");
  return m;
}

/** For settings, design, discounts, reports and team: the store owner only, not staff. */
export async function requireOwner(): Promise<Merchant> {
  const m = await requireMerchant();
  if (m.role !== "owner") redirect("/dashboard?owner_only=1");
  return m;
}
