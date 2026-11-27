"use server";

import { refresh, revalidatePath } from "next/cache";
import type { FormState } from "@/components/form-ui";
import { requireOwner } from "@/lib/auth";

const num = (v: unknown) => {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s.replace(/,/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : NaN;
};

export async function saveShipping(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const { store, db } = await requireOwner();
  const defaultFee = num(form.get("default_fee"));
  const freeOver = num(form.get("free_over"));
  let rates: { city: string; fee: unknown }[] = [];
  try {
    rates = JSON.parse(String(form.get("rates") ?? "[]"));
  } catch {}
  const clean = rates
    .map((r) => ({
      city: String(r.city ?? "")
        .trim()
        .slice(0, 40),
      fee: num(r.fee),
    }))
    .filter((r) => r.city)
    .slice(0, 60);
  if (
    Number.isNaN(defaultFee) ||
    Number.isNaN(freeOver) ||
    clean.some((r) => r.fee === null || Number.isNaN(r.fee))
  ) {
    return { error: "يوجد سعر توصيل غير صحيح" };
  }
  // Branches are edited on their own page (Settings > Branches); keep them as they are.
  const branches = store.shipping?.branches ?? [];
  const { error } = await db
    .from("stores")
    .update({
      shipping: {
        // Keep settings edited on other pages (exchange rate, and any added later).
        ...(store.shipping ?? {}),
        delivery: form.get("delivery") === "on",
        pickup_note:
          String(form.get("pickup_note") ?? "")
            .trim()
            .slice(0, 200) || null,
        default_fee: defaultFee,
        free_over: freeOver,
        rates: clean,
        branches,
        payments: store.shipping?.payments ?? undefined,
        gift: form.get("delivery") === "on" && form.get("gift") === "on",
      },
    })
    .eq("id", store.id);
  if (error) return { error: "تعذّر الحفظ، حاول مرة أخرى" };
  revalidatePath("/dashboard/settings/shipping");
  refresh();
  return { ok: "✓ تم الحفظ" };
}
