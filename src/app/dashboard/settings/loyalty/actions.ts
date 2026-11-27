"use server";

import { refresh, revalidatePath } from "next/cache";
import type { FormState } from "@/components/form-ui";
import { requireOwner } from "@/lib/auth";

const n = (f: FormData, k: string) => Number(String(f.get(k) ?? "").replace(/[,\s]/g, ""));

export async function saveLoyalty(_: FormState, form: FormData): Promise<FormState> {
  const { store, db } = await requireOwner();
  const enabled = form.get("enabled") === "on";
  const per = n(form, "per");
  const block = Math.floor(n(form, "block"));
  const reward = n(form, "reward");
  if (enabled && (!(per > 0) || !(block > 0) || !(reward > 0)))
    return { error: "أكمل الأرقام الثلاثة بأرقام أكبر من الصفر." };
  const { error } = await db
    .from("stores")
    .update({ shipping: { ...(store.shipping ?? {}), loyalty: { enabled, per, block, reward } } })
    .eq("id", store.id);
  if (error) return { error: "لم تُحفظ الإعدادات. أعد المحاولة." };
  revalidatePath("/dashboard", "layout");
  refresh();
  return { ok: enabled ? "حُفظت إعدادات النقاط، وبدأ احتسابها للطلبات المستلَمة." : "أُوقف برنامج النقاط." };
}
