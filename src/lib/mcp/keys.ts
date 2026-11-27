import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { supabaseAdmin } from "../supabase";

/** Keys look like kun_<40 hex>. Only their SHA-256 hash is stored. */
export const hashKey = (key: string) => createHash("sha256").update(key).digest("hex");

export function newKey(): string {
  return `kun_${randomBytes(20).toString("hex")}`;
}

export type KeyRow = { id: string; label: string };

/** The key behind a request, or null. Also notes when it was last used (at most once a minute). */
export async function verifyKey(raw: string | null): Promise<KeyRow | null> {
  const key = (raw ?? "").trim();
  if (!/^kun_[0-9a-f]{40}$/.test(key)) return null;
  const db = supabaseAdmin();
  const { data } = await db
    .from("mcp_keys")
    .select("id, label, last_used_at")
    .eq("key_hash", hashKey(key))
    .is("revoked_at", null)
    .maybeSingle();
  if (!data) return null;
  const last = data.last_used_at ? new Date(data.last_used_at as string).getTime() : 0;
  if (Date.now() - last > 60_000)
    await db.from("mcp_keys").update({ last_used_at: new Date().toISOString() }).eq("id", data.id);
  return { id: data.id as string, label: data.label as string };
}
