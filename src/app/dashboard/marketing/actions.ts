"use server";

import { refresh, revalidatePath } from "next/cache";
import type { FormState } from "@/components/form-ui";
import { requireOwner } from "@/lib/auth";
import { isPro } from "@/lib/plans";

export async function saveMeta(_: FormState, form: FormData): Promise<FormState> {
  if (!isPro((await requireOwner()).store)) return { error: "ربط Meta متاح بالباقة الاحترافية" };
  const { store, db } = await requireOwner();
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
  refresh();
  return { ok: "✓ انحفظت إعدادات Meta" };
}
