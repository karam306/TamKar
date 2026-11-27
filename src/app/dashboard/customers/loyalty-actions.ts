"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireAccess } from "@/lib/auth";
import { liveLoyalty } from "@/lib/loyalty";
import { pointsOf } from "@/lib/loyalty-server";
import { supabaseAdmin } from "@/lib/supabase";
import { normalizeWhatsapp } from "@/lib/templates";

/** Turns whole blocks of points into a one-time discount code (valid 60 days). */
export async function redeemPoints(
  customerId: string,
): Promise<{ code: string; amount: number; used: number; until: string } | { error: string }> {
  const { store } = await requireAccess("customers");
  const l = liveLoyalty(store);
  if (!l) return { error: "برنامج النقاط غير مفعّل." };
  const db = supabaseAdmin();
  const { data: c } = await db.from("customers").select("phone").eq("id", customerId).eq("store_id", store.id).maybeSingle();
  if (!c) return { error: "الزبون غير موجود." };
  const pts = await pointsOf(store.id, c.phone as string);
  if (!pts) return { error: "يجب تشغيل التحديث 015 أولاً." };
  const blocks = Math.floor(pts.balance / l.block);
  if (blocks < 1) return { error: `يحتاج الزبون إلى ${l.block} نقطة على الأقل.` };
  const used = blocks * l.block;
  const amount = Math.round(blocks * l.reward * 100) / 100;
  const code = `LOY${randomInt(10000, 99999)}`;
  const ends = new Date(Date.now() + 60 * 86400_000);
  const { error } = await db.from("discounts").insert({
    store_id: store.id,
    code,
    title: `استبدال ${used} نقطة`,
    kind: "fixed",
    value: amount,
    usage_limit: 1,
    ends_at: ends.toISOString(),
    active: true,
  });
  if (error) return { error: "لم يُنشأ كود الخصم. أعد المحاولة." };
  await db.from("loyalty_points").insert({
    store_id: store.id,
    phone: normalizeWhatsapp(c.phone as string),
    points: -used,
    note: `استبدال بكود ${code}`,
  });
  revalidatePath(`/dashboard/customers/${customerId}`);
  return {
    code,
    amount,
    used,
    until: new Intl.DateTimeFormat("ar-SY", { dateStyle: "medium", timeZone: "Asia/Damascus" }).format(ends),
  };
}
