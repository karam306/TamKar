"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/components/form-ui";
import { requireMerchant } from "@/lib/auth";
import { slugify } from "@/lib/product-utils";

export async function savePage(_: FormState, form: FormData): Promise<FormState> {
  const { store, db } = await requireMerchant();
  const id = String(form.get("id") ?? "");
  const title = String(form.get("title") ?? "").trim().slice(0, 100);
  if (!title) return { error: "اكتب عنوان الصفحة" };
  const raw = String(form.get("handle") ?? "").trim().toLowerCase();
  const row = {
    store_id: store.id,
    title,
    handle: /^[a-z0-9-]{1,60}$/.test(raw) ? raw : slugify(title),
    body: String(form.get("body") ?? "").slice(0, 20000),
    published: form.get("published") !== "off",
  };
  const res = id
    ? await db.from("pages").update(row).eq("id", id).eq("store_id", store.id).select("id").single()
    : await db.from("pages").insert(row).select("id").single();
  if (res.error) return { error: res.error.code === "23505" ? "في صفحة تانية بنفس الرابط" : "ما قدرنا نحفظ، جرب مرة تانية" };
  revalidatePath("/dashboard/pages");
  if (!id) redirect(`/dashboard/pages/${res.data.id}`);
  return { ok: "✓ انحفظت الصفحة" };
}

export async function deletePage(form: FormData) {
  const { store, db } = await requireMerchant();
  await db.from("pages").delete().eq("id", String(form.get("id") ?? "")).eq("store_id", store.id);
  revalidatePath("/dashboard/pages");
  redirect("/dashboard/pages");
}
