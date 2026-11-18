import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** True when Supabase env vars are set. Otherwise the app runs on demo data. */
export const hasSupabase = Boolean(url && anonKey && serviceKey);

let publicClient: SupabaseClient | null = null;
let adminClient: SupabaseClient | null = null;

/** Read-only client. Row Level Security limits it to public, active data. */
export function supabasePublic(): SupabaseClient {
  if (!url || !anonKey) throw new Error("Supabase is not configured");
  publicClient ??= createClient(url, anonKey, { auth: { persistSession: false } });
  return publicClient;
}

/** Full-access client. Server only; never import this into a client component. */
export function supabaseAdmin(): SupabaseClient {
  if (!url || !serviceKey) throw new Error("Supabase is not configured");
  adminClient ??= createClient(url, serviceKey, { auth: { persistSession: false } });
  return adminClient;
}
