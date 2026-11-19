"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { sendDeliveredEvent } from "@/lib/meta";
import { redirect } from "next/navigation";
import type { FormState } from "@/components/form-ui";
import { requireMerchant } from "@/lib/auth";
import { createOrder } from "@/lib/data";
import { supabaseAdmin } from "@/lib/supabase";
import type { CartItem, Order, OrderStatus } from "@/lib/types";
import { ORDER_STATUSES } from "./status";

const label = (s: string) => ORDER_STATUSES.find((x) => x.id === s)?.label ?? s;

async function addEvent(orderId: string, storeId: string, message: string) {
  const { db } = await requireMerchant();
  await db.from("order_events").insert({ order_id: orderId, store_id: storeId, message: message.slice(0, 1000) });
}

export async function setOrderStatus(form: FormData) {
  const { store, db } = await requireMerchant();
  const id = String(form.get("id") ?? "");
  const status = String(form.get("status") ?? "") as OrderStatus;
  if (!["new", "confirmed", "shipped", "delivered"].includes(status)) return;
  const { data } = await db.from("orders").update({ status }).eq("id", id).eq("store_id", store.id).neq("status", "cancelled").select("*").maybeSingle();
  if (data) {
    await addEvent(id, store.id, `تغيرت الحالة إلى: ${label(status)}`);
    if (status === "delivered") {
      const o = data as Order;
      after(() => sendDeliveredEvent(store, { ...o, total: Number(o.total) }));
    }
  }
  revalidatePath(`/dashboard/orders/${id}`);
}

export async function setPaid(form: FormData) {
  const { store, db } = await requireMerchant();
  const id = String(form.get("id") ?? "");
  const paid = form.get("paid") === "1";
  const { data } = await db.from("orders").update({ payment_status: paid ? "paid" : "pending" }).eq("id", id).eq("store_id", store.id).select("id").maybeSingle();
  if (data) await addEvent(id, store.id, paid ? "تم استلام المبلغ" : "رجع الطلب لحالة غير مدفوع");
  revalidatePath(`/dashboard/orders/${id}`);
}

export async function cancelOrder(form: FormData) {
  const { store } = await requireMerchant();
  const id = String(form.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/.test(id)) return;
  // The database function checks the order belongs to this store.
  await supabaseAdmin().rpc("cancel_order", { p_order: id, p_store: store.id, p_restock: form.get("restock") === "on" });
  revalidatePath(`/dashboard/orders/${id}`);
}

export async function addComment(form: FormData) {
  const { store } = await requireMerchant();
  const id = String(form.get("id") ?? "");
  const text = String(form.get("message") ?? "").trim();
  if (text) await addEvent(id, store.id, text);
  revalidatePath(`/dashboard/orders/${id}`);
}

export async function saveMerchantNote(form: FormData) {
  const { store, db } = await requireMerchant();
  const id = String(form.get("id") ?? "");
  await db.from("orders").update({ merchant_note: String(form.get("note") ?? "").trim().slice(0, 1000) || null }).eq("id", id).eq("store_id", store.id);
  revalidatePath(`/dashboard/orders/${id}`);
}

/** Order taken by phone or WhatsApp, entered by the merchant. */
export async function createManualOrder(_: FormState, form: FormData): Promise<FormState> {
  const { store: own, db } = await requireMerchant();
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
    },
    items,
    "manual",
    String(form.get("discount_code") ?? "") || undefined,
  );
  if (!res.ok) return { error: res.error };
  if (form.get("paid") === "on") {
    await db.from("orders").update({ payment_status: "paid" }).eq("id", res.order.id).eq("store_id", own.id);
  }
  revalidatePath("/dashboard/orders");
  redirect(`/dashboard/orders/${res.order.id}`);
}
