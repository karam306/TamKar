"use server";

import { refresh, revalidatePath } from "next/cache";
import type { FormState } from "@/components/form-ui";
import { requireOwner } from "@/lib/auth";
import { FX_ROUND_STEPS, type Fx } from "@/lib/fx";

/** Today's exchange rate for a dollar store. An empty rate turns it off. */
export async function saveFx(_: FormState, form: FormData): Promise<FormState> {
  const { store, db } = await requireOwner();
  if (store.currency !== "USD")
    return { error: "سعر الصرف يُستخدم عندما تكون أسعار متجرك بالدولار." };
  const raw = String(form.get("rate") ?? "").replace(/[,\s٬]/g, "").replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
  const old = store.shipping?.fx;
  let fx: Fx | null = null;
  if (raw) {
    const rate = Number(raw);
    if (!(rate > 0) || rate > 1_000_000) return { error: "اكتب سعر الصرف رقماً، مثل 115." };
    const roundIn = Number(form.get("round") ?? old?.round ?? 5);
    const show = (form.get("show") ?? old?.show) === "both" ? "both" : "syp";
    fx = {
      rate: Math.round(rate * 100) / 100,
      round: FX_ROUND_STEPS.includes(roundIn) ? roundIn : 1,
      show,
      updated_at: new Date().toISOString(),
    };
  }
  const { error } = await db
    .from("stores")
    .update({ shipping: { ...(store.shipping ?? {}), fx } })
    .eq("id", store.id);
  if (error) return { error: "لم يُحفظ سعر الصرف. تحقق من الاتصال ثم أعد المحاولة." };
  revalidatePath("/dashboard", "layout");
  revalidatePath(`/s/${store.slug}`, "layout");
  refresh();
  return { ok: fx ? `حُفظ سعر الصرف: ${fx.rate} ل.س للدولار.` : "أُوقف التحويل. تظهر الأسعار بالدولار." };
}
