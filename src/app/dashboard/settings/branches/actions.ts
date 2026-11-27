"use server";

import { refresh, revalidatePath } from "next/cache";
import type { FormState } from "@/components/form-ui";
import { requireOwner } from "@/lib/auth";
import { isPro, LIMITS } from "@/lib/plans";
import { normalizeWhatsapp } from "@/lib/templates";

/** Pro: extra shops the customer can pick up from. The main shop is branch one. */
export async function saveBranches(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const { store, db } = await requireOwner();
  if (!isPro(store)) return { error: "الفروع متاحة في الباقة الاحترافية." };
  let raw: { id?: unknown; name?: unknown; note?: unknown; whatsapp?: unknown }[] = [];
  try {
    raw = JSON.parse(String(form.get("branches") ?? "[]"));
  } catch {}
  const branches = raw
    .map((b) => ({
      id: String(b.id ?? "").slice(0, 12) || Math.random().toString(36).slice(2, 10),
      name: String(b.name ?? "").trim().slice(0, 60),
      note: String(b.note ?? "").trim().slice(0, 200) || null,
      whatsapp: normalizeWhatsapp(String(b.whatsapp ?? "")),
    }))
    .filter((b) => b.name)
    .slice(0, LIMITS.pro.branches - 1);
  const bad = branches.find((b) => !/^\d{9,15}$/.test(b.whatsapp));
  if (bad) return { error: `رقم واتساب فرع "${bad.name}" غير صحيح. اكتبه مع رمز الدولة، مثل 963912345678.` };
  const { error } = await db
    .from("stores")
    .update({ shipping: { ...(store.shipping ?? {}), branches } })
    .eq("id", store.id);
  if (error) return { error: "لم تُحفظ الفروع. تحقق من الاتصال ثم أعد المحاولة." };
  revalidatePath("/dashboard/settings/branches");
  refresh();
  return { ok: "حُفظت الفروع." };
}
