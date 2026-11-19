"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/components/form-ui";
import { requireMerchant } from "@/lib/auth";

const url = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  if (!s) return undefined;
  const full = /^https?:\/\//.test(s) ? s : `https://${s}`;
  return /^https:\/\/[^\s]+$/.test(full) ? full.slice(0, 300) : null;
};

export async function saveSeo(_: FormState, form: FormData): Promise<FormState> {
  const { store, db } = await requireMerchant();
  const image = String(form.get("image") ?? "");
  const social = {
    instagram: url(form.get("instagram")),
    facebook: url(form.get("facebook")),
    tiktok: url(form.get("tiktok")),
    telegram: url(form.get("telegram")),
  };
  if (Object.values(social).some((v) => v === null)) return { error: "في رابط سوشال ميديا غير صحيح" };
  const { error } = await db
    .from("stores")
    .update({
      seo: {
        title: String(form.get("title") ?? "").trim().slice(0, 70) || undefined,
        description: String(form.get("description") ?? "").trim().slice(0, 170) || undefined,
        image: image.startsWith(`/api/media/${store.id}/`) ? image : undefined,
      },
      social,
    })
    .eq("id", store.id);
  if (error) return { error: "ما قدرنا نحفظ، جرب مرة تانية" };
  revalidatePath("/dashboard/seo");
  return { ok: "✓ انحفظ" };
}
