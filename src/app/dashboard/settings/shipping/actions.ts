"use server";

import { refresh, revalidatePath } from "next/cache";
import type { FormState } from "@/components/form-ui";
import { requireOwner } from "@/lib/auth";
import { isPro, LIMITS } from "@/lib/plans";
import { normalizeWhatsapp } from "@/lib/templates";

const num = (v: unknown) => {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s.replace(/,/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : NaN;
};

export async function saveShipping(_: FormState, form: FormData): Promise<FormState> {
  const { store, db } = await requireOwner();
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
  let rawBranches: { id?: unknown; name?: unknown; note?: unknown; whatsapp?: unknown }[] = [];
  try {
    rawBranches = JSON.parse(String(form.get("branches") ?? "[]"));
  } catch {}
  const branches = isPro(store)
    ? rawBranches
        .map((b) => ({
          id: String(b.id ?? "").slice(0, 12) || Math.random().toString(36).slice(2, 10),
          name: String(b.name ?? "").trim().slice(0, 60),
          note: String(b.note ?? "").trim().slice(0, 200) || null,
          whatsapp: normalizeWhatsapp(String(b.whatsapp ?? "")),
        }))
        .filter((b) => b.name)
        .slice(0, LIMITS.pro.branches - 1)
    : [];
  if (branches.some((b) => !/^\d{9,15}$/.test(b.whatsapp))) return { error: "في فرع رقم واتسابه غير صحيح" };
  const { error } = await db
    .from("stores")
    .update({
      shipping: {
        delivery: form.get("delivery") === "on",
        pickup_note: String(form.get("pickup_note") ?? "").trim().slice(0, 200) || null,
        default_fee: defaultFee,
        free_over: freeOver,
        rates: clean,
        branches,
        payments: store.shipping?.payments ?? undefined,
      },
    })
    .eq("id", store.id);
  if (error) return { error: "ما قدرنا نحفظ، جرب مرة تانية" };
  revalidatePath("/dashboard/settings/shipping");
  refresh();
  return { ok: "✓ انحفظ" };
}
