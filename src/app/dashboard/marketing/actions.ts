"use server";

import { refresh, revalidatePath } from "next/cache";
import type { FormState } from "@/components/form-ui";
import { requireOwner } from "@/lib/auth";
import { isPro } from "@/lib/plans";
import { cancelRequest, requestManaged } from "@/lib/meta-managed";

export async function saveMeta(_: FormState, form: FormData): Promise<FormState> {
  if (!isPro((await requireOwner()).store)) return { error: "ربط Meta متاح في الباقة الاحترافية" };
  const { store, db } = await requireOwner();
  const pixel = String(form.get("pixel") ?? "").replace(/\D/g, "");
  const token = String(form.get("token") ?? "").trim();
  if (pixel && !/^\d{5,20}$/.test(pixel)) return { error: "يجب أن يتكوّن رقم البيكسل من أرقام فقط" };
  const update: Record<string, string | null> = { meta_pixel_id: pixel || null };
  if (form.get("clear_token") === "on") update.meta_capi_token = null;
  else if (token) {
    if (!/^[A-Za-z0-9_-]{50,600}$/.test(token)) return { error: "رمز Conversions API غير صحيح، انسخه كاملاً" };
    update.meta_capi_token = token;
  }
  const { error } = await db.from("stores").update(update).eq("id", store.id);
  if (error) return { error: "تعذّر الحفظ، حاول مرة أخرى" };
  revalidatePath("/dashboard/marketing");
  refresh();
  return { ok: "✓ تم حفظ إعدادات Meta" };
}

/** Option 1: the merchant asks the Kun team to connect Meta for them. */
export async function requestMetaHelp(_: FormState, form: FormData): Promise<FormState> {
  const { store } = await requireOwner();
  const page = String(form.get("page_url") ?? "").trim().slice(0, 300);
  try {
    await requestManaged(store.id, page);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "تعذّر إرسال الطلب" };
  }
  revalidatePath("/dashboard/marketing");
  refresh();
  return { ok: "✓ وصل طلبك إلى فريق كُن، وسنتواصل معك قريباً" };
}

export async function cancelMetaHelp(): Promise<FormState> {
  const { store } = await requireOwner();
  await cancelRequest(store.id).catch(() => {});
  revalidatePath("/dashboard/marketing");
  refresh();
  return { ok: "تم إلغاء الطلب" };
}
