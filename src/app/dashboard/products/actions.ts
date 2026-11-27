"use server";

import { cleanOffers } from "@/lib/offers";
import { syncCatalogLater } from "@/lib/meta-managed";
import { LIMIT_MSG, productRoom } from "@/lib/plan-guard";
import { refresh, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/components/form-ui";
import { requireAccess } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { deleteImages, saveImage } from "@/lib/media";
import { cleanVariants, parseJSON, toNum, txt } from "@/lib/clean-product";

export async function uploadImage(
  form: FormData,
): Promise<{ url?: string; error?: string }> {
  const { store } = await requireAccess("products");
  try {
    return { url: await saveImage(store.id, form.get("file") as File) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "حدث خطأ" };
  }
}

/** The cost price lives in its own private table (update 018). Owner only. */
async function saveCost(storeId: string, productId: string, form: FormData, owner: boolean) {
  if (!owner || form.get("cost_field") !== "1") return;
  const raw = toNum(form.get("cost"));
  const cost = raw === null || Number.isNaN(raw) || raw < 0 ? null : Math.round(raw * 100) / 100;
  const { error } = await supabaseAdmin()
    .from("product_costs")
    .upsert({ product_id: productId, store_id: storeId, cost, updated_at: new Date().toISOString() }, { onConflict: "product_id" });
  if (error) console.error("cost not saved (run 018)", error.message);
}

export async function saveProduct(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const { store, db, role } = await requireAccess("products");
  const owner = role === "owner";
  const id = String(form.get("id") ?? "");
  const title = txt(form.get("title"), 200);
  let price = toNum(form.get("price"));
  const compare = toNum(form.get("compare_at_price"));
  const stockRaw = toNum(form.get("stock"));
  const images = parseJSON<string[]>(form.get("images"), [])
    .filter(
      (u) =>
        typeof u === "string" &&
        (u.startsWith(`/api/media/${store.id}/`) ||
          /^\/demo\/[a-z0-9-]+\.svg$/.test(u)),
    )
    .slice(0, 10);

  const v = cleanVariants(
    parseJSON(form.get("options"), []),
    parseJSON(form.get("variants"), []),
  );
  if ("error" in v) return { error: v.error };
  const withVariants = v.variants.length > 0;
  if (withVariants) price = Math.min(...v.variants.map((x) => x.price));

  if (!title) return { error: "أدخل اسم المنتج" };
  if (price === null || Number.isNaN(price)) return { error: "أدخل سعراً صحيحاً" };
  if (Number.isNaN(compare)) return { error: "السعر قبل الخصم غير صحيح" };
  if (Number.isNaN(stockRaw)) return { error: "الكمية غير صحيحة" };

  // Only collections that belong to this store.
  const wanted = form.getAll("collection_ids").map(String);
  const { data: own } = wanted.length
    ? await db
        .from("collections")
        .select("id")
        .eq("store_id", store.id)
        .in("id", wanted)
    : { data: [] };

  const specs = parseJSON<{ name?: unknown; value?: unknown }[]>(
    form.get("specs"),
    [],
  )
    .map((x) => ({ name: txt(x?.name, 40), value: txt(x?.value, 200) }))
    .filter((x) => x.name && x.value)
    .slice(0, 30);

  const row = {
    store_id: store.id,
    specs,
    title,
    description: txt(form.get("description"), 5000) || null,
    price,
    compare_at_price:
      !withVariants && compare && compare > price ? compare : null,
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
    const { data: old } = await db
      .from("products")
      .select("images")
      .eq("id", id)
      .eq("store_id", store.id)
      .maybeSingle();
    const { error } = await db
      .from("products")
      .update(row)
      .eq("id", id)
      .eq("store_id", store.id);
    if (error) return { error: "تعذّر الحفظ، حاول مرة أخرى" };
    await saveOffers(db, store.id, id, form);
    await saveCost(store.id, id, form, owner);
    await deleteImages(
      store.id,
      ((old?.images as string[]) ?? []).filter((u) => !images.includes(u)),
    );
    syncCatalogLater(store.id);
    revalidatePath("/dashboard/products");
    refresh();
    return { ok: "✓ تم حفظ المنتج" };
  }
  if ((await productRoom(db, store)) < 1) return { error: LIMIT_MSG };
  const { data, error } = await db
    .from("products")
    .insert(row)
    .select("id")
    .single();
  if (error || !data) return { error: "تعذّر الحفظ، حاول مرة أخرى" };
  await saveOffers(db, store.id, data.id as string, form);
  await saveCost(store.id, data.id as string, form, owner);
  syncCatalogLater(store.id);
  revalidatePath("/dashboard/products");
  refresh();
  redirect(`/dashboard/products/${data.id}?created=1`);
}

export async function deleteProduct(form: FormData) {
  const { store, db } = await requireAccess("products");
  const id = String(form.get("id") ?? "");
  const { data } = await db
    .from("products")
    .delete()
    .eq("id", id)
    .eq("store_id", store.id)
    .select("images")
    .maybeSingle();
  if (data) await deleteImages(store.id, (data.images as string[]) ?? []);
  syncCatalogLater(store.id);
  revalidatePath("/dashboard/products");
  refresh();
  redirect("/dashboard/products");
}

export async function duplicateProduct(form: FormData) {
  const { store, db } = await requireAccess("products");
  const id = String(form.get("id") ?? "");
  const { data: p } = await db
    .from("products")
    .select("*")
    .eq("id", id)
    .eq("store_id", store.id)
    .maybeSingle();
  if (!p) return;
  if ((await productRoom(db, store)) < 1)
    redirect("/dashboard/products?limit=1");
  const copy = {
    ...p,
    title: `${p.title} (نسخة)`,
    active: false,
    images: [] as string[],
  };
  delete (copy as Record<string, unknown>).id;
  delete (copy as Record<string, unknown>).created_at;
  const { data } = await db.from("products").insert(copy).select("id").single();
  if (data) redirect(`/dashboard/products/${data.id}`);
}

/** Bulk actions from the product list: show, hide or delete several products. */
export async function bulkProducts(form: FormData) {
  const { store, db } = await requireAccess("products");
  const ids = form
    .getAll("ids")
    .map(String)
    .filter((x) => /^[0-9a-f-]{36}$/.test(x))
    .slice(0, 500);
  const action = String(form.get("action") ?? "");
  if (!ids.length) return;
  if (action === "activate" || action === "draft") {
    await db
      .from("products")
      .update({ active: action === "activate" })
      .eq("store_id", store.id)
      .in("id", ids);
  } else if (action === "delete") {
    const { data } = await db
      .from("products")
      .delete()
      .eq("store_id", store.id)
      .in("id", ids)
      .select("images");
    await deleteImages(
      store.id,
      (data ?? []).flatMap((r) => (r.images as string[]) ?? []),
    );
  }
  syncCatalogLater(store.id);
  revalidatePath("/dashboard/products");
  refresh();
}

/** Quantity offers live in their own column (update 015); saved separately so products save before it. */
async function saveOffers(db: Awaited<ReturnType<typeof requireAccess>>["db"], storeId: string, id: string, form: FormData) {
  if (!form.has("qty_prices")) return;
  const offers = cleanOffers(parseJSON(form.get("qty_prices"), []));
  const { error } = await db.from("products").update({ qty_prices: offers }).eq("id", id).eq("store_id", storeId);
  if (error) console.error("qty_prices not saved (run 015)", error.message);
}

/** Show or hide one product straight from the product list. */
export async function setProductActive(id: string, active: boolean): Promise<{ ok?: true; error?: string }> {
  const { store, db } = await requireAccess("products");
  if (!/^[0-9a-f-]{36}$/.test(String(id))) return { error: "المنتج غير موجود" };
  const { data, error } = await db
    .from("products")
    .update({ active: Boolean(active) })
    .eq("id", id)
    .eq("store_id", store.id)
    .select("id");
  if (error || !data?.length) return { error: "تعذّر تغيير الحالة" };
  syncCatalogLater(store.id);
  revalidatePath("/dashboard/products");
  return { ok: true };
}
