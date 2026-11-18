import "server-only";
import type { Merchant } from "@/lib/auth";

export async function storeCategories({ store, db }: Merchant): Promise<string[]> {
  const { data } = await db.from("products").select("category").eq("store_id", store.id).not("category", "is", null).limit(1000);
  return [...new Set((data ?? []).map((r) => r.category as string))];
}
