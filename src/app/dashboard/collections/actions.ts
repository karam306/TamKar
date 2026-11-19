"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/components/form-ui";
import { requireMerchant } from "@/lib/auth";
import { deleteImages } from "@/lib/media";
import { slugify } from "@/lib/product-utils";

export async function saveCollection(_: FormState, form: FormData): Promise<FormState> {
  const { store, db } = await requireMerchant();
  const id = String(form.get("id") ?? "");
  const title = String(form.get("title") ?? "").trim().slice(0, 100);
  if (!title) return { error: "اكتب اسم المجموعة" };
  const rawHandle = String(form.get("handle") ?? "").trim().toLowerCase();
  const handle = /^[a-z0-9-]{1,60}$/.test(rawHandle) ? rawHandle : slugify(title);
  const image = String(form.get("image") ?? "");
  const row = {
    store_id: store.id,
    title,
    handle,
    description: String(form.get("description") ?? "").trim().slice(0, 2000) || null,
    image: image.startsWith(`/api/media/${store.id}/`) ? image : null,
  };
  const res = id
    ? await db.from("collections").update(row).eq("id", id).eq("store_id", store.id).select("id").single()
    : await db.from("collections").insert(row).select("id").single();
  if (res.error) return { error: res.error.code === "23505" ? "في مجموعة تانية بنفس الرابط، غيّر الرابط" : "ما قدرنا نحفظ، جرب مرة تانية" };
  revalidatePath("/dashboard/collections");
  if (!id) redirect(`/dashboard/collections/${res.data.id}?created=1`);
  return { ok: "✓ انحفظت المجموعة" };
}

export async function deleteCollection(form: FormData) {
  const { store, db } = await requireMerchant();
  const id = String(form.get("id") ?? "");
  const { data } = await db.from("collections").delete().eq("id", id).eq("store_id", store.id).select("image").maybeSingle();
  if (data?.image) await deleteImages(store.id, [data.image as string]);
  revalidatePath("/dashboard/collections");
  redirect("/dashboard/collections");
}

/** Adds or removes products from a collection. */
export async function setCollectionProducts(form: FormData) {
  const { store, db } = await requireMerchant();
  const id = String(form.get("id") ?? "");
  const ids = form.getAll("product_ids").map(String).filter((x) => /^[0-9a-f-]{36}$/.test(x)).slice(0, 200);
  const remove = form.get("mode") === "remove";
  if (!ids.length || !/^[0-9a-f-]{36}$/.test(id)) return;
  const { data } = await db.from("products").select("id, collection_ids").eq("store_id", store.id).in("id", ids);
  for (const p of data ?? []) {
    const cur = (p.collection_ids as string[]) ?? [];
    const next = remove ? cur.filter((c) => c !== id) : [...new Set([...cur, id])];
    await db.from("products").update({ collection_ids: next }).eq("id", p.id).eq("store_id", store.id);
  }
  revalidatePath(`/dashboard/collections/${id}`);
}
