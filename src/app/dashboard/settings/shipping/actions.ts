"use server";

import { refresh, revalidatePath } from "next/cache";
import type { FormState } from "@/components/form-ui";
import { requireMerchant } from "@/lib/auth";

const num = (v: unknown) => {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s.replace(/,/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : NaN;
};

export async function saveShipping(_: FormState, form: FormData): Promise<FormState> {
  const { store, db } = await requireMerchant();
  const defaultFee = num(form.get("default_fee"));
  const freeOver = num(form.get("free_over"));
  let rates: { city: string; fee: unknown }[] = [];
  try {
    rates = JSON.parse(String(form.get("rates") ?? "[]"));
  } catch {}
  const clean = rates
    .map((r) => ({ city: String(r.city ?? "").trim().slice(0, 40), fee: num(r.fee) }))
    .filter((r) => r.city)
    .slice(0, 60);
  if (Number.isNaN(defaultFee) || Number.isNaN(freeOver) || clean.some((r) => r.fee === null || Number.isNaN(r.fee))) {
    return { error: "في سعر توصيل غير صحيح" };
  }
  const { error } = await db
    .from("stores")
    .update({ shipping: { default_fee: defaultFee, free_over: freeOver, rates: clean } })
    .eq("id", store.id);
  if (error) return { error: "ما قدرنا نحفظ، جرب مرة تانية" };
  revalidatePath("/dashboard/settings/shipping");
  refresh();
  return { ok: "✓ انحفظت أسعار التوصيل" };
}
