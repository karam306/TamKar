import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isPro, LIMITS } from "./plans";

/** How many more products this store can add (Infinity on Pro). */
export async function productRoom(db: SupabaseClient, store: { id: string; plan?: string | null }): Promise<number> {
  if (isPro(store)) return Infinity;
  const { count } = await db.from("products").select("id", { count: "exact", head: true }).eq("store_id", store.id);
  return Math.max(0, LIMITS.basic.products - (count ?? 0));
}

export const LIMIT_MSG = `الباقة الأساسية لغاية ${LIMITS.basic.products} منتج. رقّي للاحترافي لتضيف بلا حدود.`;
