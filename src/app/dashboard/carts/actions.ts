"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireAccess } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

/** The reminder was sent (with or without a code). */
export async function markReminded(id: string): Promise<void> {
  const { store } = await requireAccess("orders");
  if (!/^[0-9a-f-]{36}$/.test(id)) return;
  await supabaseAdmin()
    .from("abandoned_carts")
    .update({ reminded_at: new Date().toISOString() })
    .eq("id", id)
    .eq("store_id", store.id);
  revalidatePath("/dashboard/carts");
}

/** A one-time discount code for this customer, valid for 3 days. */
export async function makeCartCode(percent: number): Promise<{ code: string; until: string } | { error: string }> {
  const { store } = await requireAccess("orders");
  const off = [5, 10, 15].includes(percent) ? percent : 10;
  const code = `BACK${randomInt(1000, 9999)}`;
  const ends = new Date(Date.now() + 3 * 86400_000);
  const { error } = await supabaseAdmin().from("discounts").insert({
    store_id: store.id,
    code,
    title: `خصم إكمال الطلب ${off}٪`,
    kind: "percent",
    value: off,
    usage_limit: 1,
    ends_at: ends.toISOString(),
    active: true,
  });
  if (error) return { error: "لم يُنشأ كود الخصم. أعد المحاولة." };
  revalidatePath("/dashboard/discounts");
  return {
    code,
    until: new Intl.DateTimeFormat("ar-SY", { dateStyle: "medium", timeZone: "Asia/Damascus" }).format(ends),
  };
}
