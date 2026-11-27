"use server";

import { refresh, revalidatePath } from "next/cache";
import type { FormState } from "@/components/form-ui";
import { requireAccess } from "@/lib/auth";
import { orderDue } from "@/lib/debts";
import { supabaseAdmin } from "@/lib/supabase";

const NEEDS_013 = "يجب تشغيل التحديث 013_fx_debts.sql في Supabase أولاً.";
const missing = (m?: string) => /on_credit|order_payments|schema cache|does not exist/.test(m ?? "");

/** Marks an unpaid order as sold on credit, or takes the mark off (only while nothing was paid). */
export async function setCredit(form: FormData) {
  const { store } = await requireAccess("orders");
  const id = String(form.get("id") ?? "");
  const on = form.get("on") === "1";
  if (!/^[0-9a-f-]{36}$/.test(id)) return;
  const db = supabaseAdmin();
  if (!on) {
    const { count } = await db.from("order_payments").select("id", { count: "exact", head: true }).eq("order_id", id);
    if ((count ?? 0) > 0) return;
  }
  const { error } = await db
    .from("orders")
    .update({ on_credit: on })
    .eq("id", id)
    .eq("store_id", store.id)
    .neq("payment_status", "paid");
  if (error) console.error("setCredit", missing(error.message) ? NEEDS_013 : error.message);
  revalidatePath(`/dashboard/orders/${id}`);
  revalidatePath("/dashboard/debts");
  refresh();
}

/** Records part (or all) of a debt as paid. When nothing is left, the order becomes paid. */
export async function addPayment(_: FormState, form: FormData): Promise<FormState> {
  const { store, user } = await requireAccess("orders");
  const id = String(form.get("id") ?? "");
  const amount = Math.round(Number(String(form.get("amount") ?? "").replace(/[,\s]/g, "")) * 100) / 100;
  const note = String(form.get("note") ?? "").trim().slice(0, 200) || null;
  if (!/^[0-9a-f-]{36}$/.test(id)) return { error: "الطلب غير موجود." };
  if (!(amount > 0)) return { error: "اكتب المبلغ المدفوع." };
  const db = supabaseAdmin();
  const { data: o, error: oe } = await db
    .from("orders")
    .select("id, total, refunded, on_credit")
    .eq("id", id)
    .eq("store_id", store.id)
    .maybeSingle();
  if (oe) return { error: missing(oe.message) ? NEEDS_013 : "لم تُسجَّل الدفعة. أعد المحاولة." };
  if (!o) return { error: "الطلب غير موجود." };
  const { data: pays, error: pe } = await db.from("order_payments").select("amount").eq("order_id", id);
  if (pe) return { error: missing(pe.message) ? NEEDS_013 : "لم تُسجَّل الدفعة. أعد المحاولة." };
  const { due } = orderDue(o, pays ?? []);
  if (amount > due + 0.01) return { error: `المبلغ أكبر من المتبقي (${due}).` };
  const { error } = await db
    .from("order_payments")
    .insert({ store_id: store.id, order_id: id, amount, note, created_by: user.id });
  if (error) return { error: missing(error.message) ? NEEDS_013 : "لم تُسجَّل الدفعة. أعد المحاولة." };
  const left = Math.round((due - amount) * 100) / 100;
  await db
    .from("orders")
    .update({ on_credit: true, ...(left <= 0.01 ? { payment_status: "paid" } : {}) })
    .eq("id", id);
  revalidatePath(`/dashboard/orders/${id}`);
  revalidatePath("/dashboard/debts");
  refresh();
  return { ok: left <= 0.01 ? "سُجّلت الدفعة، وسُدّد الطلب بالكامل." : `سُجّلت الدفعة. المتبقي ${left}.` };
}
