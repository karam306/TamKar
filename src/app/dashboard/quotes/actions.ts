"use server";

import { randomBytes } from "node:crypto";
import { refresh, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/components/form-ui";
import { requireMerchant } from "@/lib/auth";
import { isPro } from "@/lib/plans";
import type { QuoteLine } from "@/lib/types";

const num = (v: unknown) => {
  const n = Number(String(v ?? "").replace(/,/g, ""));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0;
};

/** Saves a quote. Prices are whatever the merchant typed: quotes can have special prices. */
export async function createQuote(_: FormState, form: FormData): Promise<FormState> {
  const { store, db } = await requireMerchant();
  if (!isPro(store)) return { error: "عروض الأسعار متاحة بالباقة الاحترافية" };
  let raw: Partial<QuoteLine>[] = [];
  try {
    raw = JSON.parse(String(form.get("items") ?? "[]"));
  } catch {}
  const items: QuoteLine[] = raw
    .slice(0, 100)
    .map((l) => ({
      title: String(l.title ?? "").trim().slice(0, 200),
      variantTitle: l.variantTitle ? String(l.variantTitle).slice(0, 100) : null,
      price: num(l.price),
      qty: Math.min(9999, Math.max(1, Math.floor(Number(l.qty) || 1))),
      productId: l.productId ? String(l.productId) : null,
    }))
    .filter((l) => l.title);
  if (!items.length) return { error: "ضيف منتج واحد على الأقل" };
  const name = String(form.get("customer_name") ?? "").trim().slice(0, 120);
  if (!name) return { error: "اكتب اسم الزبون" };
  const subtotal = items.reduce((s, l) => s + l.price * l.qty, 0);
  const discount = Math.min(num(form.get("discount")), subtotal);
  const delivery = num(form.get("delivery_fee"));
  const days = Math.min(90, Math.max(1, Math.floor(Number(form.get("valid_days")) || 7)));
  const valid = new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
  const { data, error } = await db
    .from("quotes")
    .insert({
      store_id: store.id,
      customer_name: name,
      phone: String(form.get("phone") ?? "").trim().slice(0, 30) || null,
      items,
      discount,
      delivery_fee: delivery,
      total: Math.round((subtotal - discount + delivery) * 100) / 100,
      notes: String(form.get("notes") ?? "").trim().slice(0, 1000) || null,
      valid_until: valid,
      share_token: randomBytes(16).toString("hex"),
    })
    .select("id")
    .single();
  if (error || !data) return { error: "ما قدرنا نحفظ العرض" };
  revalidatePath("/dashboard/quotes");
  redirect(`/dashboard/quotes/${data.id}?created=1`);
}

export async function setQuoteStatus(form: FormData) {
  const { store, db } = await requireMerchant();
  const id = String(form.get("id") ?? "");
  const status = String(form.get("status") ?? "");
  if (!["sent", "accepted", "declined"].includes(status)) return;
  await db.from("quotes").update({ status }).eq("id", id).eq("store_id", store.id);
  revalidatePath(`/dashboard/quotes/${id}`);
  refresh();
}

export async function deleteQuote(form: FormData) {
  const { store, db } = await requireMerchant();
  await db.from("quotes").delete().eq("id", String(form.get("id") ?? "")).eq("store_id", store.id);
  revalidatePath("/dashboard/quotes");
  redirect("/dashboard/quotes");
}
