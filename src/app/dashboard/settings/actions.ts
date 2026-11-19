"use server";

import { refresh, revalidatePath } from "next/cache";
import type { FormState } from "@/components/form-ui";
import { requireMerchant } from "@/lib/auth";
import { normalizeWhatsapp } from "@/lib/templates";

const str = (f: FormData, k: string, max: number) => String(f.get(k) ?? "").trim().slice(0, max);

export async function saveSettings(_: FormState, form: FormData): Promise<FormState> {
  const { store, db } = await requireMerchant();
  const name = str(form, "name", 80);
  const whatsapp = normalizeWhatsapp(str(form, "whatsapp", 20));
  const currency = str(form, "currency", 3);
  if (name.length < 2) return { error: "اكتب اسم المتجر" };
  if (!/^\d{9,15}$/.test(whatsapp)) return { error: "رقم واتساب غير صحيح" };
  if (!["USD", "SYP"].includes(currency)) return { error: "اختار العملة" };

  const { error } = await db
    .from("stores")
    .update({
      name,
      tagline: str(form, "tagline", 160) || null,
      whatsapp,
      city: str(form, "city", 60) || null,
      currency,
      delivery_note: str(form, "delivery_note", 200) || null,
    })
    .eq("id", store.id);
  if (error) return { error: "ما قدرنا نحفظ، جرب مرة تانية" };
  revalidatePath("/dashboard", "layout");
  refresh();
  return { ok: "✓ انحفظت الإعدادات" };
}
