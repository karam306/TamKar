"use server";

import { refresh, revalidatePath } from "next/cache";
import { requireMerchant } from "@/lib/auth";
import { readProductSheet } from "@/lib/sheets";

export type ImportResult = { ok?: string; error?: string; problems?: string[] } | undefined;

const toNum = (s?: string) => {
  if (s == null || s.trim() === "") return null;
  const n = Number(s.replace(/[,\s$]/g, "").replace(/ل\.?س/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : NaN;
};

/**
 * Imports products from Excel/CSV. Rows whose SKU already exists in the store
 * update that product (price, stock...); other rows are added as new products.
 */
export async function importProducts(_: ImportResult, form: FormData): Promise<ImportResult> {
  const { store, db } = await requireMerchant();
  const file = form.get("file") as File | null;
  if (!file || file.size === 0) return { error: "اختار ملف" };
  if (file.size > 4 * 1024 * 1024) return { error: "الملف كبير كتير (الحد 4 ميغا). قسّمه لكذا ملف." };

  let rows;
  try {
    rows = await readProductSheet(file);
  } catch {
    return { error: "ما قدرنا نقرأ الملف. تأكد إنه Excel (.xlsx) أو CSV" };
  }
  if (rows.length === 0) return { error: "الملف فاضي أو ما فيه عمود \"الاسم\"" };
  if (rows.length > 20000) return { error: "الحد 20,000 منتج بالملف الواحد" };

  // Existing SKUs in this store, to update instead of duplicating.
  const skuToId = new Map<string, string>();
  for (let from = 0; ; from += 1000) {
    const { data } = await db.from("products").select("id, sku").eq("store_id", store.id).not("sku", "is", null).range(from, from + 999);
    (data ?? []).forEach((r) => skuToId.set(String(r.sku), String(r.id)));
    if (!data || data.length < 1000) break;
  }

  const problems: string[] = [];
  const inserts: Record<string, unknown>[] = [];
  const updates: { id: string; row: Record<string, unknown> }[] = [];

  rows.forEach((r, i) => {
    const line = i + 2;
    const title = (r.title ?? "").slice(0, 200);
    const price = toNum(r.price);
    const compare = toNum(r.compare_at_price);
    const stock = toNum(r.stock);
    if (!title) return void problems.push(`سطر ${line}: ما في اسم`);
    if (price === null || Number.isNaN(price)) return void problems.push(`سطر ${line}: السعر غير صحيح`);
    if (Number.isNaN(compare) || Number.isNaN(stock)) return void problems.push(`سطر ${line}: رقم غير صحيح`);
    const status = (r.status ?? "").trim().toLowerCase();
    const row = {
      title,
      description: r.description?.slice(0, 5000) || null,
      price,
      compare_at_price: compare && compare > price ? compare : null,
      stock: stock === null ? null : Math.floor(stock),
      sku: r.sku?.slice(0, 60) || null,
      category: r.category?.slice(0, 60) || null,
      active: !["مسودة", "draft", "مخفي", "false", "0", "no", "لا"].includes(status),
    };
    const existing = row.sku ? skuToId.get(row.sku) : undefined;
    if (existing) updates.push({ id: existing, row });
    else inserts.push({ ...row, store_id: store.id });
  });

  let added = 0;
  for (let i = 0; i < inserts.length; i += 500) {
    const { error } = await db.from("products").insert(inserts.slice(i, i + 500));
    if (error) {
      problems.push(`صار خطأ بحفظ دفعة من المنتجات (من ${i + 1} لـ ${Math.min(i + 500, inserts.length)})`);
      continue;
    }
    added += Math.min(500, inserts.length - i);
  }
  let updated = 0;
  for (const u of updates) {
    const { error } = await db.from("products").update(u.row).eq("id", u.id).eq("store_id", store.id);
    if (!error) updated++;
  }

  revalidatePath("/dashboard/products");

  refresh();
  return {
    ok: `✓ انضاف ${added} منتج${updated ? ` وتحدّث ${updated}` : ""}`,
    problems: problems.slice(0, 50),
  };
}
