"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/components/form-ui";
import { requireMerchant } from "@/lib/auth";

const num = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s.replace(/,/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : NaN;
};
const date = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const d = new Date(`${s}T00:00:00+03:00`); // Syria time
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
};

export async function saveDiscount(_: FormState, form: FormData): Promise<FormState> {
  const { store, db } = await requireMerchant();
  const id = String(form.get("id") ?? "");
  const automatic = form.get("method") === "automatic";
  const kind = String(form.get("kind") ?? "");
  const code = String(form.get("code") ?? "").trim().toUpperCase().replace(/\s+/g, "");
  const title = String(form.get("title") ?? "").trim().slice(0, 80);
  const value = num(form.get("value"));
  const min = num(form.get("min_subtotal"));
  const limit = num(form.get("usage_limit"));
  const starts = date(form.get("starts_at"));
  const ends = date(form.get("ends_at"));

  if (!["percent", "fixed", "free_shipping"].includes(kind)) return { error: "اختار نوع الخصم" };
  if (!automatic && !/^[A-Z0-9_-]{3,30}$/.test(code)) return { error: "الكود لازم يكون من 3 لـ 30 حرف إنكليزي أو رقم" };
  if (automatic && !title) return { error: "اكتب اسم للخصم (بيظهر للزبون بالسلة)" };
  if (kind !== "free_shipping" && (value === null || Number.isNaN(value) || value <= 0)) return { error: "اكتب قيمة الخصم" };
  if (kind === "percent" && value! > 100) return { error: "النسبة لازم تكون 100 أو أقل" };
  if (Number.isNaN(min) || Number.isNaN(limit) || starts === undefined || ends === undefined) return { error: "في قيمة غير صحيحة" };

  const row = {
    store_id: store.id,
    code: automatic ? null : code,
    title: title || code,
    kind,
    value: kind === "free_shipping" ? 0 : value,
    min_subtotal: min,
    automatic,
    usage_limit: limit === null ? null : Math.floor(limit) || null,
    starts_at: starts,
    ends_at: ends,
    active: form.get("active") !== "off",
  };
  const res = id
    ? await db.from("discounts").update(row).eq("id", id).eq("store_id", store.id)
    : await db.from("discounts").insert(row);
  if (res.error) return { error: res.error.code === "23505" ? "في كود خصم بنفس الاسم" : "ما قدرنا نحفظ، جرب مرة تانية" };
  revalidatePath("/dashboard/discounts");
  redirect("/dashboard/discounts?saved=1");
}

export async function deleteDiscount(form: FormData) {
  const { store, db } = await requireMerchant();
  await db.from("discounts").delete().eq("id", String(form.get("id") ?? "")).eq("store_id", store.id);
  revalidatePath("/dashboard/discounts");
  redirect("/dashboard/discounts");
}
