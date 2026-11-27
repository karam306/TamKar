"use server";

import { refresh, revalidatePath } from "next/cache";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { hashKey, newKey } from "@/lib/mcp/keys";
import { supabaseAdmin } from "@/lib/supabase";

/** Makes a key and returns it once. Only its hash is kept. */
export async function createKey(label: string): Promise<{ key?: string; error?: string }> {
  await requirePlatformAdmin();
  const key = newKey();
  const { error } = await supabaseAdmin()
    .from("mcp_keys")
    .insert({ label: label.trim().slice(0, 60) || "Claude", key_hash: hashKey(key), key_hint: key.slice(-4) });
  if (error)
    return { error: /mcp_keys|schema cache|does not exist/.test(error.message) ? "شغّل التحديث 016_claude_connector.sql في Supabase أولاً." : "لم يُنشأ المفتاح. أعد المحاولة." };
  revalidatePath("/admin/claude");
  return { key };
}

export async function revokeKey(form: FormData) {
  await requirePlatformAdmin();
  const id = String(form.get("id") ?? "");
  await supabaseAdmin().from("mcp_keys").update({ revoked_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/admin/claude");
  refresh();
}
