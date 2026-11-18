import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
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

export type Merchant = { user: User; store: MerchantStore; db: SupabaseClient };

/** The signed-in merchant and their store, or null. */
export const getMerchant = cache(async (): Promise<Merchant | null> => {
  if (!hasSupabase) return null;
  const db = await supabaseUser();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return null;
  const { data: store } = await db.from("stores").select("*").eq("owner_id", user.id).maybeSingle();
  if (!store) return null;
  return { user, store: store as MerchantStore, db };
});

/** Use at the top of every dashboard page and action. */
export async function requireMerchant(): Promise<Merchant> {
  const m = await getMerchant();
  if (!m) redirect("/login");
  return m;
}
