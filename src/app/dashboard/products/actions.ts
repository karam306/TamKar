"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/components/form-ui";
import { requireMerchant } from "@/lib/auth";
import { deleteImages, saveImage } from "@/lib/media";

export async function uploadImage(form: FormData): Promise<{ url?: string; error?: string }> {
  const { store } = await requireMerchant();
  try {
    return { url: await saveImage(store.id, form.get("file") as File) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "صار خطأ" };
  }
}

const num = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").replace(/,/g, "").trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
};

export async function saveProduct(_: FormState, form: FormData): Promise<FormState> {
  const { store, db } = await requireMerchant();
  const id = String(form.get("id") ?? "");
  const title = String(form.get("title") ?? "").trim().slice(0, 200);
  const price = num(form.get("price"));
  const compare = num(form.get("compare_at_price"));
  const stockRaw = num(form.get("stock"));
  let images: string[] = [];
  try {
    images = JSON.parse(String(form.get("images") ?? "[]"));
  } catch {}
  images = images.filter((u) => typeof u === "string" && u.startsWith(`/api/media/${store.id}/`)).slice(0, 8);

  if (!title) return { error: "اكتب اسم المنتج" };
  if (price === null || Number.isNaN(price)) return { error: "اكتب سعر صحيح" };
  if (Number.isNaN(compare)) return { error: "السعر قبل الخصم غير صحيح" };
  if (Number.isNaN(stockRaw)) return { error: "الكمية غير صحيحة" };

  const row = {
    store_id: store.id,
    title,
    description: String(form.get("description") ?? "").trim().slice(0, 4000) || null,
    price,
    compare_at_price: compare && compare > price ? compare : null,
    category: String(form.get("category") ?? "").trim().slice(0, 60) || null,
    stock: stockRaw === null ? null : Math.floor(stockRaw),
    active: form.get("active") === "on",
    images,
  };

  if (id) {
    const { data: old } = await db.from("products").select("images").eq("id", id).eq("store_id", store.id).maybeSingle();
    const { error } = await db.from("products").update(row).eq("id", id).eq("store_id", store.id);
    if (error) return { error: "ما قدرنا نحفظ، جرب مرة تانية" };
    const removed = ((old?.images as string[]) ?? []).filter((u) => !images.includes(u));
    await deleteImages(store.id, removed);
  } else {
    const { error } = await db.from("products").insert(row);
    if (error) return { error: "ما قدرنا نحفظ، جرب مرة تانية" };
  }
  revalidatePath("/dashboard/products");
  redirect("/dashboard/products?saved=1");
}

export async function deleteProduct(form: FormData) {
  const { store, db } = await requireMerchant();
  const id = String(form.get("id") ?? "");
  const { data } = await db.from("products").delete().eq("id", id).eq("store_id", store.id).select("images").maybeSingle();
  if (data) await deleteImages(store.id, (data.images as string[]) ?? []);
  revalidatePath("/dashboard/products");
  redirect("/dashboard/products");
}

export async function toggleProduct(form: FormData) {
  const { store, db } = await requireMerchant();
  const id = String(form.get("id") ?? "");
  const active = form.get("active") === "1";
  await db.from("products").update({ active }).eq("id", id).eq("store_id", store.id);
  revalidatePath("/dashboard/products");
}
