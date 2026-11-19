import "server-only";
import type { Merchant } from "@/lib/auth";
import { templateFor } from "@/lib/business-templates";
import type { Collection } from "@/lib/types";

export async function formData({ store, db }: Merchant): Promise<{ categories: string[]; collections: Collection[]; optionPresets: string[]; specPresets: string[] }> {
  const t = templateFor((store as { business_type?: string }).business_type);
  const [cats, cols] = await Promise.all([
    db.from("products").select("category").eq("store_id", store.id).not("category", "is", null).limit(5000),
    db.from("collections").select("*").eq("store_id", store.id).order("title"),
  ]);
  return {
    categories: [...new Set([...(cats.data ?? []).map((r) => r.category as string), ...t.productTypes])],
    optionPresets: t.options,
    specPresets: t.specs,
    collections: (cols.data ?? []) as Collection[],
  };
}
