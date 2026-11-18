import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// All Supabase traffic happens on the server. Browsers only ever talk to our
// own domain, so the site keeps working even if supabase.co is blocked somewhere.
/** Accepts the URL with or without "/rest/v1" or a trailing slash. */
export function cleanSupabaseUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, "").replace(/\/(rest|auth|storage)\/v1$/, "").replace(/\/+$/, "");
}

export const SUPABASE_URL = cleanSupabaseUrl(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "");
export const SUPABASE_PUBLIC_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";

/** True when Supabase is configured. Otherwise the app runs on demo data only. */
export const hasSupabase = Boolean(SUPABASE_URL && SUPABASE_PUBLIC_KEY && SUPABASE_SECRET_KEY);

let publicClient: SupabaseClient | null = null;
let adminClient: SupabaseClient | null = null;

/** Read-only client for storefronts. Row Level Security limits it to public, active data. */
export function supabasePublic(): SupabaseClient {
  if (!hasSupabase) throw new Error("Supabase is not configured");
  publicClient ??= createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, { auth: { persistSession: false } });
  return publicClient;
}

/** Full-access client. Server only. Use it only after checking who is asking. */
export function supabaseAdmin(): SupabaseClient {
  if (!hasSupabase) throw new Error("Supabase is not configured");
  adminClient ??= createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return adminClient;
}

export const MEDIA_BUCKET = "media";
