"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/components/form-ui";
import { requireMerchant } from "@/lib/auth";

export async function saveMeta(_: FormState, form: FormData): Promise<FormState> {
  const { store, db } = await requireMerchant();
  const pixel = String(form.get("pixel") ?? "").replace(/\D/g, "");
  const token = String(form.get("token") ?? "").trim();
  if (pixel && !/^\d{5,20}$/.test(pixel)) return { error: "رقم البيكسل لازم يكون أرقام بس" };
  const update: Record<string, string | null> = { meta_pixel_id: pixel || null };
  if (form.get("clear_token") === "on") update.meta_capi_token = null;
  else if (token) {
    if (!/^[A-Za-z0-9_-]{50,600}$/.test(token)) return { error: "رمز Conversions API مش صحيح، انسخه كامل" };
    update.meta_capi_token = token;
  }
  const { error } = await db.from("stores").update(update).eq("id", store.id);
  if (error) return { error: "ما قدرنا نحفظ، جرب مرة تانية" };
  revalidatePath("/dashboard/marketing");
  return { ok: "✓ انحفظت إعدادات Meta" };
}
