import "server-only";
import type { Merchant } from "@/lib/auth";
import type { Collection } from "@/lib/types";

export async function formData({ store, db }: Merchant): Promise<{ categories: string[]; collections: Collection[] }> {
  const [cats, cols] = await Promise.all([
    db.from("products").select("category").eq("store_id", store.id).not("category", "is", null).limit(5000),
    db.from("collections").select("*").eq("store_id", store.id).order("title"),
  ]);
  return {
    categories: [...new Set((cats.data ?? []).map((r) => r.category as string))],
    collections: (cols.data ?? []) as Collection[],
  };
}
