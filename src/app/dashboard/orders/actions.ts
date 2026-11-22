"use server";

import { refresh, revalidatePath } from "next/cache";
import { after } from "next/server";
import { sendDeliveredEvent } from "@/lib/meta";
import { redirect } from "next/navigation";
import type { FormState } from "@/components/form-ui";
import { requireAccess } from "@/lib/auth";
import { createOrder } from "@/lib/data";
import { supabaseAdmin } from "@/lib/supabase";
import type { CartItem, Order, OrderStatus } from "@/lib/types";
import { statusLabel } from "./status";

async function addEvent(orderId: string, storeId: string, message: string) {
  const { db } = await requireAccess("orders");
  await db
    .from("order_events")
    .insert({
      order_id: orderId,
      store_id: storeId,
      message: message.slice(0, 1000),
    });
}

export async function setOrderStatus(form: FormData) {
  const { store, db } = await requireAccess("orders");
  const id = String(form.get("id") ?? "");
  const status = String(form.get("status") ?? "") as OrderStatus;
  if (!["new", "confirmed", "shipped", "delivered"].includes(status)) return;
  const { data } = await db
    .from("orders")
    .update({ status })
    .eq("id", id)
    .eq("store_id", store.id)
    .neq("status", "cancelled")
    .select("*")
    .maybeSingle();
  if (data) {
    await addEvent(
      id,
      store.id,
      `تغيرت الحالة إلى: ${statusLabel(status, (data as Order).fulfillment === "pickup")}`,
    );
    if (status === "delivered") {
      const o = data as Order;
      after(() => sendDeliveredEvent(store, { ...o, total: Number(o.total) }));
    }
  }
  revalidatePath(`/dashboard/orders/${id}`);
  refresh();
}

export async function setPaid(form: FormData) {
  const { store, db } = await requireAccess("orders");
  const id = String(form.get("id") ?? "");
  const paid = form.get("paid") === "1";
  const { data } = await db
    .from("orders")
    .update({ payment_status: paid ? "paid" : "pending" })
    .eq("id", id)
    .eq("store_id", store.id)
    .select("id")
    .maybeSingle();
  if (data)
    await addEvent(
      id,
      store.id,
      paid ? "تم استلام المبلغ" : "رجع الطلب لحالة غير مدفوع",
    );
  revalidatePath(`/dashboard/orders/${id}`);
  refresh();
}

export async function cancelOrder(form: FormData) {
  const { store } = await requireAccess("orders");
  const id = String(form.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/.test(id)) return;
  // The database function checks the order belongs to this store.
  await supabaseAdmin().rpc("cancel_order", {
    p_order: id,
    p_store: store.id,
    p_restock: form.get("restock") === "on",
  });
  revalidatePath(`/dashboard/orders/${id}`);
  refresh();
}

export async function addComment(form: FormData) {
  const { store } = await requireAccess("orders");
  const id = String(form.get("id") ?? "");
  const text = String(form.get("message") ?? "").trim();
  if (text) await addEvent(id, store.id, text);
  revalidatePath(`/dashboard/orders/${id}`);
  refresh();
}

export async function saveMerchantNote(form: FormData) {
  const { store, db } = await requireAccess("orders");
  const id = String(form.get("id") ?? "");
  await db
    .from("orders")
    .update({
      merchant_note:
        String(form.get("note") ?? "")
          .trim()
          .slice(0, 1000) || null,
    })
    .eq("id", id)
    .eq("store_id", store.id);
  revalidatePath(`/dashboard/orders/${id}`);
  refresh();
}

/** Order taken by phone or WhatsApp, entered by the merchant. */
export async function createManualOrder(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const { store: own, db } = await requireAccess("orders");
  let items: CartItem[] = [];
  try {
    items = JSON.parse(String(form.get("items") ?? "[]"));
  } catch {}
  if (!items.length) return { error: "ضيف منتج واحد على الأقل" };
  const res = await createOrder(
    own,
    {
      name: String(form.get("name") ?? ""),
      phone: String(form.get("phone") ?? ""),
      city: String(form.get("city") ?? ""),
      address: String(form.get("address") ?? ""),
      notes: String(form.get("notes") ?? ""),
      method: form.get("method") === "delivery" ? "delivery" : "pickup",
    },
    items,
    "manual",
    String(form.get("discount_code") ?? "") || undefined,
  );
  if (!res.ok) return { error: res.error };
  if (form.get("paid") === "on") {
    await db
      .from("orders")
      .update({ payment_status: "paid" })
      .eq("id", res.order.id)
      .eq("store_id", own.id);
  }
  revalidatePath("/dashboard/orders");
  refresh();
  redirect(`/dashboard/orders/${res.order.id}`);
}

/** Return items (back to stock), give money back, or exchange for other items. One database step. */
export async function processReturn(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const { store, user } = await requireAccess("orders");
  const id = String(form.get("id") ?? "");
  let p: {
    kind: "refund" | "exchange";
    items: { productId: string; variantId?: string; qty: number }[];
    newItems: { productId: string; variantId?: string; qty: number }[];
    restock: boolean;
    refund: number;
    extra: number;
    method: string;
    reason: string;
  };
  try {
    p = JSON.parse(String(form.get("payload") ?? "{}"));
  } catch {
    return { error: "صار خطأ، جرب مرة تانية" };
  }
  const lines = (a: unknown) =>
    (Array.isArray(a) ? a : [])
      .slice(0, 50)
      .map((i) => ({
        productId: String(i.productId),
        ...(i.variantId ? { variantId: String(i.variantId) } : {}),
        qty: Math.floor(Number(i.qty)),
      }))
      .filter(
        (i) => /^[0-9a-f-]{36}$/.test(i.productId) && i.qty > 0 && i.qty <= 999,
      );
  const { error } = await supabaseAdmin().rpc("process_return", {
    p_order: id,
    p_store: store.id,
    p_kind: p.kind === "exchange" ? "exchange" : "refund",
    p_items: lines(p.items),
    p_new_items: p.kind === "exchange" ? lines(p.newItems) : [],
    p_restock: Boolean(p.restock),
    p_refund: Math.max(0, Number(p.refund) || 0),
    p_extra: p.kind === "exchange" ? Math.max(0, Number(p.extra) || 0) : 0,
    p_method: String(p.method ?? "").slice(0, 40),
    p_reason: String(p.reason ?? "").slice(0, 300),
    p_user: user.id,
  });
  if (error) {
    const m = error.message ?? "";
    console.error("processReturn", error.code, m);
    if (
      error.code === "PGRST202" ||
      error.code === "42883" ||
      /process_return/.test(m)
    )
      return { error: "لازم يتشغّل تحديث 011 بقاعدة البيانات أول" };
    if (m.includes("TOO_MANY_RETURNED"))
      return { error: "عم ترجّع قطع أكتر من اللي انطلبت (أو رجعت قبل)" };
    if (m.includes("REFUND_TOO_BIG"))
      return { error: "المبلغ اللي عم ترجعه أكبر من اللي دفعه الزبون" };
    if (m.includes("NOTHING_TO_DO"))
      return { error: "اختار قطع ترجع، أو منتج للتبديل، أو مبلغ" };
    if (m.includes("ORDER_CANCELLED")) return { error: "الطلب ملغي" };
    const out = m.match(/OUT_OF_STOCK:([^\n]+)/);
    if (out) return { error: `ما في كمية كافية من ${out[1]}` };
    const vr = m.match(/VARIANT_REQUIRED:([^\n]+)/);
    if (vr) return { error: `اختار المقاس أو اللون لـ ${vr[1]}` };
    return { error: "ما قدرنا نسجل الاسترجاع، جرب مرة تانية" };
  }
  revalidatePath(`/dashboard/orders/${id}`);
  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard/products");
  redirect(`/dashboard/orders/${id}?returned=1`);
}
