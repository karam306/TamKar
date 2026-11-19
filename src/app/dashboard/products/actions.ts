"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/components/form-ui";
import { requireMerchant } from "@/lib/auth";
import { deleteImages, saveImage } from "@/lib/media";
import { combinations } from "@/lib/product-utils";
import type { ProductOption, Variant } from "@/lib/types";

export async function uploadImage(form: FormData): Promise<{ url?: string; error?: string }> {
  const { store } = await requireMerchant();
  try {
    return { url: await saveImage(store.id, form.get("file") as File) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "صار خطأ" };
  }
}

const toNum = (v: unknown): number | null => {
  const s = String(v ?? "").replace(/,/g, "").trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
};
const txt = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

function parseJSON<T>(v: FormDataEntryValue | null, fallback: T): T {
  try {
    return JSON.parse(String(v ?? "")) as T;
  } catch {
    return fallback;
  }
}

/** Checks options and variants sent by the editor and rebuilds them cleanly. */
function cleanVariants(rawOptions: unknown, rawVariants: unknown): { options: ProductOption[]; variants: Variant[] } | { error: string } {
  const options: ProductOption[] = (Array.isArray(rawOptions) ? rawOptions : [])
    .slice(0, 3)
    .map((o: { name?: unknown; values?: unknown }) => ({
      name: txt(o?.name, 30),
      values: [...new Set((Array.isArray(o?.values) ? o.values : []).map((v: unknown) => txt(v, 40)).filter(Boolean))].slice(0, 30),
    }))
    .filter((o) => o.name && o.values.length);
  if (options.length === 0) return { options: [], variants: [] };

  const combos = combinations(options);
  if (combos.length > 100) return { error: "عدد الخيارات كبير كتير (الحد 100)" };
  const sent = Array.isArray(rawVariants) ? (rawVariants as Partial<Variant>[]) : [];

  const variants: Variant[] = [];
  for (const combo of combos) {
    const match = sent.find((v) => Array.isArray(v.options) && v.options.join("|") === combo.join("|"));
    const price = toNum(match?.price);
    const compare = toNum(match?.compare_at_price);
    const stock = toNum(match?.stock);
    const title = combo.join(" / ");
    if (price === null || Number.isNaN(price)) return { error: `اكتب سعر للخيار "${title}"` };
    if (Number.isNaN(stock) || Number.isNaN(compare)) return { error: `في رقم غير صحيح بالخيار "${title}"` };
    variants.push({
      id: typeof match?.id === "string" && /^[\w-]{1,40}$/.test(match.id) ? match.id : randomUUID().slice(0, 8),
      title,
      options: combo,
      price,
      compare_at_price: compare && compare > price ? compare : null,
      stock: stock === null ? null : Math.floor(stock),
      sku: txt(match?.sku, 60) || null,
    });
  }
  return { options, variants };
}

export async function saveProduct(_: FormState, form: FormData): Promise<FormState> {
  const { store, db } = await requireMerchant();
  const id = String(form.get("id") ?? "");
  const title = txt(form.get("title"), 200);
  let price = toNum(form.get("price"));
  const compare = toNum(form.get("compare_at_price"));
  const stockRaw = toNum(form.get("stock"));
  const images = parseJSON<string[]>(form.get("images"), [])
    .filter((u) => typeof u === "string" && (u.startsWith(`/api/media/${store.id}/`) || /^\/demo\/[a-z0-9-]+\.svg$/.test(u)))
    .slice(0, 10);

  const v = cleanVariants(parseJSON(form.get("options"), []), parseJSON(form.get("variants"), []));
  if ("error" in v) return { error: v.error };
  const withVariants = v.variants.length > 0;
  if (withVariants) price = Math.min(...v.variants.map((x) => x.price));

  if (!title) return { error: "اكتب اسم المنتج" };
  if (price === null || Number.isNaN(price)) return { error: "اكتب سعر صحيح" };
  if (Number.isNaN(compare)) return { error: "السعر قبل الخصم غير صحيح" };
  if (Number.isNaN(stockRaw)) return { error: "الكمية غير صحيحة" };

  // Only collections that belong to this store.
  const wanted = form.getAll("collection_ids").map(String);
  const { data: own } = wanted.length ? await db.from("collections").select("id").eq("store_id", store.id).in("id", wanted) : { data: [] };

  const specs = parseJSON<{ name?: unknown; value?: unknown }[]>(form.get("specs"), [])
    .map((x) => ({ name: txt(x?.name, 40), value: txt(x?.value, 200) }))
    .filter((x) => x.name && x.value)
    .slice(0, 30);

  const row = {
    store_id: store.id,
    specs,
    title,
    description: txt(form.get("description"), 5000) || null,
    price,
    compare_at_price: !withVariants && compare && compare > price ? compare : null,
    category: txt(form.get("category"), 60) || null,
    sku: withVariants ? null : txt(form.get("sku"), 60) || null,
    stock: withVariants || stockRaw === null ? null : Math.floor(stockRaw),
    active: form.get("status") !== "draft",
    images,
    options: v.options,
    variants: v.variants,
    collection_ids: (own ?? []).map((c) => c.id as string),
  };

  if (id) {
    const { data: old } = await db.from("products").select("images").eq("id", id).eq("store_id", store.id).maybeSingle();
    const { error } = await db.from("products").update(row).eq("id", id).eq("store_id", store.id);
    if (error) return { error: "ما قدرنا نحفظ، جرب مرة تانية" };
    await deleteImages(store.id, ((old?.images as string[]) ?? []).filter((u) => !images.includes(u)));
    revalidatePath("/dashboard/products");
    return { ok: "✓ انحفظ المنتج" };
  }
  const { data, error } = await db.from("products").insert(row).select("id").single();
  if (error || !data) return { error: "ما قدرنا نحفظ، جرب مرة تانية" };
  revalidatePath("/dashboard/products");
  redirect(`/dashboard/products/${data.id}?created=1`);
}

export async function deleteProduct(form: FormData) {
  const { store, db } = await requireMerchant();
  const id = String(form.get("id") ?? "");
  const { data } = await db.from("products").delete().eq("id", id).eq("store_id", store.id).select("images").maybeSingle();
  if (data) await deleteImages(store.id, (data.images as string[]) ?? []);
  revalidatePath("/dashboard/products");
  redirect("/dashboard/products");
}

export async function duplicateProduct(form: FormData) {
  const { store, db } = await requireMerchant();
  const id = String(form.get("id") ?? "");
  const { data: p } = await db.from("products").select("*").eq("id", id).eq("store_id", store.id).maybeSingle();
  if (!p) return;
  const copy = { ...p, title: `${p.title} (نسخة)`, active: false, images: [] as string[] };
  delete (copy as Record<string, unknown>).id;
  delete (copy as Record<string, unknown>).created_at;
  const { data } = await db.from("products").insert(copy).select("id").single();
  if (data) redirect(`/dashboard/products/${data.id}`);
}

/** Bulk actions from the product list: show, hide or delete several products. */
export async function bulkProducts(form: FormData) {
  const { store, db } = await requireMerchant();
  const ids = form.getAll("ids").map(String).filter((x) => /^[0-9a-f-]{36}$/.test(x)).slice(0, 500);
  const action = String(form.get("action") ?? "");
  if (!ids.length) return;
  if (action === "activate" || action === "draft") {
    await db.from("products").update({ active: action === "activate" }).eq("store_id", store.id).in("id", ids);
  } else if (action === "delete") {
    const { data } = await db.from("products").delete().eq("store_id", store.id).in("id", ids).select("images");
    await deleteImages(store.id, (data ?? []).flatMap((r) => (r.images as string[]) ?? []));
  }
  revalidatePath("/dashboard/products");
}
