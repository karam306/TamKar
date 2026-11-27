"use server";

import { revalidatePath } from "next/cache";
import { requireAccess } from "@/lib/auth";
import { createOrder } from "@/lib/data";
import { liveFx, money } from "@/lib/fx";
import { awardPoints } from "@/lib/loyalty-server";
import { supabaseAdmin } from "@/lib/supabase";
import type { CartItem } from "@/lib/types";

export type SaleResult =
  | { ok: true; id: string; number: number; receipt: string; phone: string | null }
  | { ok: false; error: string };

const WALK_IN_NAME = "زبون المحل";
const WALK_IN_PHONE = "0000000000";

/**
 * A sale inside the shop: saved as a manual order that is already handed over,
 * so stock, reports and (for credit) the debt ledger all stay complete.
 */
export async function sellInStore(input: {
  items: CartItem[];
  name?: string;
  phone?: string;
  pay: "cash" | "sham_cash" | "syriatel_cash" | "mtn_cash" | "credit";
  /** A discount code, e.g. one made from loyalty points. */
  code?: string;
}): Promise<SaleResult> {
  const { store } = await requireAccess("orders");
  const items = (Array.isArray(input.items) ? input.items : [])
    .slice(0, 100)
    .map((i) => ({
      productId: String(i.productId),
      ...(i.variantId ? { variantId: String(i.variantId) } : {}),
      qty: Math.floor(Number(i.qty)),
    }))
    .filter((i) => /^[0-9a-f-]{36}$/.test(i.productId) && i.qty > 0 && i.qty <= 999);
  if (!items.length) return { ok: false, error: "أضف منتجاً واحداً على الأقل." };
  const name = String(input.name ?? "").trim().slice(0, 80);
  const phone = String(input.phone ?? "").replace(/[^\d+]/g, "").slice(0, 20);
  const credit = input.pay === "credit";
  if (credit && (name.length < 2 || phone.replace(/\D/g, "").length < 9))
    return { ok: false, error: "للبيع بالآجل اكتب اسم الزبون ورقم هاتفه." };
  if (phone && phone.replace(/\D/g, "").length < 9) return { ok: false, error: "رقم الهاتف غير صحيح." };

  const res = await createOrder(
    store,
    { name: name || WALK_IN_NAME, phone: phone || WALK_IN_PHONE, city: "", address: "", notes: "", method: "pickup" },
    items,
    "manual",
    String(input.code ?? "").trim().slice(0, 40) || undefined,
  );
  if (!res.ok) return { ok: false, error: res.error };
  const o = res.order;
  const db = supabaseAdmin();
  const method = input.pay === "cash" || credit ? "cod" : input.pay;
  // Handed over in the shop: delivered, and paid unless sold on credit.
  await db
    .from("orders")
    .update({ status: "delivered", payment_status: credit ? "pending" : "paid", payment_method: method })
    .eq("id", o.id)
    .eq("store_id", store.id);
  // Separate steps: these columns come with updates 013 and 014; the sale is saved either way.
  const { error: e1 } = await db.from("orders").update({ in_store: true }).eq("id", o.id);
  if (e1) console.error("in_store not saved (run 014)", e1.message);
  // Loyalty points for a named customer (the sale is handed over now).
  if (phone) await awardPoints(store, { id: o.id, phone, total: o.total });
  if (credit) {
    const { error: e2 } = await db.from("orders").update({ on_credit: true }).eq("id", o.id);
    if (e2) console.error("on_credit not saved (run 013)", e2.message);
  }

  const m = money(store.currency, liveFx(store));
  const t = m.totals(o.items, o.discount, 0);
  const discountLine = o.discount > 0 ? `الخصم${o.discount_code ? ` (${o.discount_code})` : ""}: -${m.text(t.discount)}` : "";
  const day = new Intl.DateTimeFormat("ar-SY", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Damascus" }).format(new Date());
  const receipt = [
    `إيصال من ${store.name}`,
    `رقم #${o.number} · ${day}`,
    "",
    ...o.items.map((i) => `• ${i.title}${i.variantTitle ? ` (${i.variantTitle})` : ""} × ${i.qty} = ${m.text(m.unit(i.price) * i.qty)}`),
    "",
    ...(discountLine ? [discountLine] : []),
    `المجموع: ${m.text(t.total)}`,
    credit ? "طريقة الدفع: بالآجل" : "تم الدفع",
    "",
    "شكراً لزيارتكم.",
  ].join("\n");

  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard");
  return { ok: true, id: o.id, number: o.number, receipt, phone: phone || null };
}
