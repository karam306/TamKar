"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { Field, SaveRow } from "@/components/form-ui";
import { ImageUploader } from "@/components/image-uploader";
import type { Collection, Product } from "@/lib/types";
import { saveProduct, uploadImage } from "./actions";
import { AiWriter } from "./ai-writer";
import { OffersEditor } from "./offers-editor";
import { SpecsEditor } from "./specs-editor";
import { VariantEditor } from "./variant-editor";

export function ProductForm({
  product,
  currency,
  categories,
  collections,
  optionPresets,
  specPresets,
  placeholders,
  cost,
}: {
  /** The owner sees and edits the cost price; staff never get it (undefined). */
  cost?: { value: number | null };
  product?: Product;
  currency: string;
  categories: string[];
  collections: Collection[];
  optionPresets: string[];
  specPresets: string[];
  placeholders: { title: string; description: string; type: string };
}) {
  const [state, action] = useActionState(saveProduct, undefined);
  const [withVariants, setWithVariants] = useState((product?.options?.length ?? 0) > 0);
  const [price, setPrice] = useState(product?.price != null ? String(product.price) : "");
  const unit = currency === "SYP" ? "ل.س" : "$";
  const [costText, setCostText] = useState(cost?.value != null ? String(cost.value) : "");
  const formRef = useRef<HTMLFormElement>(null);
  const [specs, setSpecs] = useState({ key: 0, rows: product?.specs ?? [] });
  const set = (name: string, value: string) => {
    const el = formRef.current?.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | null;
    if (el && value) el.value = value;
  };

  return (
    <form ref={formRef} action={action} className="grid items-start gap-4 lg:grid-cols-[1fr_300px]">
      <input type="hidden" name="id" value={product?.id ?? ""} />

      <div className="space-y-4">
        <section className="card space-y-3 p-4">
          <Field label="العنوان">
            <input name="title" required defaultValue={product?.title} maxLength={200} className="input" placeholder={placeholders.title} />
          </Field>
          <Field label="الوصف">
            <textarea name="description" rows={6} defaultValue={product?.description ?? ""} className="input" placeholder={placeholders.description} />
          </Field>
          <ImageUploader name="images" initial={product?.images ?? []} upload={uploadImage} max={10} label="الصور" />
          <AiWriter
            getForm={() => formRef.current}
            categories={categories}
            onResult={(p) => {
              set("title", p.title);
              set("description", p.description);
              set("category", p.category);
              if (p.specs.length) setSpecs((s) => ({ key: s.key + 1, rows: p.specs }));
            }}
          />
        </section>

        {!withVariants && (
          <>
            <section className="card space-y-3 p-4">
              <h2 className="text-sm font-semibold">السعر</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={`السعر (${unit})`}>
                  <input name="price" required inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} className="input" dir="ltr" />
                </Field>
                <Field label={`السعر قبل الخصم (${unit})`} hint="يظهر مشطوباً بجانب السعر">
                  <input name="compare_at_price" inputMode="decimal" defaultValue={product?.compare_at_price ?? ""} className="input" dir="ltr" />
                </Field>
              </div>
            </section>
            <section className="card space-y-3 p-4">
              <h2 className="text-sm font-semibold">المخزون</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="الكمية المتوفرة" hint="اتركه فارغاً إذا كانت الكمية غير محدودة. تنقص تلقائياً مع كل طلب">
                  <input name="stock" inputMode="numeric" defaultValue={product?.stock ?? ""} className="input" dir="ltr" />
                </Field>
                <Field label="SKU (رمز المنتج)">
                  <input name="sku" defaultValue={product?.sku ?? ""} className="input" dir="ltr" />
                </Field>
              </div>
            </section>
          </>
        )}

        {cost && (
          <section className="card space-y-3 p-4">
            <h2 className="text-sm font-semibold">سعر التكلفة</h2>
            <Field
              label={`كم كلّفك هذا المنتج؟ (${unit})`}
              hint={
                withVariants
                  ? "يُطبَّق على كل الخيارات. لتكلفة مختلفة لكل خيار افتح الحسابات ← أسعار التكلفة."
                  : "لا يظهر للزبائن ولا للموظفين. يُستخدم لحساب ربحك."
              }
            >
              <input name="cost" inputMode="decimal" value={costText} onChange={(e) => setCostText(e.target.value)} className="input" dir="ltr" />
            </Field>
            {!withVariants && (() => {
              const p = Number(price), c = Number(costText);
              if (!costText.trim() || !price.trim() || !Number.isFinite(p) || !Number.isFinite(c) || p <= 0) return null;
              const profit = p - c;
              return (
                <p className={`text-[13px] ${profit >= 0 ? "text-[#1a7f37]" : "text-red-700"}`}>
                  الربح في كل قطعة: {profit.toLocaleString("en-US", { maximumFractionDigits: 2 })} {unit} ({Math.round((profit / p) * 100)}٪ من سعر البيع)
                </p>
              );
            })()}
            <input type="hidden" name="cost_field" value="1" />
          </section>
        )}

        <OffersEditor initial={product?.qty_prices ?? []} />

        <SpecsEditor key={specs.key} initial={specs.rows} presets={specPresets} />

        <section className="card space-y-3 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">الخيارات</h2>
            {withVariants && <span className="text-xs text-muted">لكل خيار سعر وكمية خاصان به</span>}
          </div>
          {withVariants ? (
            <>
              <input type="hidden" name="price" value={price || "0"} />
              <VariantEditor initialOptions={product?.options ?? []} initialVariants={product?.variants ?? []} basePrice={price} presets={optionPresets} />
            </>
          ) : (
            <button type="button" className="text-[13px] font-semibold text-[#005bd3] hover:underline" onClick={() => setWithVariants(true)}>
              + لهذا المنتج خيارات، مثل {optionPresets.slice(0, 2).join(" أو ")}
            </button>
          )}
        </section>
      </div>

      <div className="space-y-4">
        <section className="card space-y-2 p-4">
          <h2 className="text-sm font-semibold">الحالة</h2>
          <select name="status" defaultValue={product && !product.active ? "draft" : "active"} className="input">
            <option value="active">نشط (ظاهر في المتجر)</option>
            <option value="draft">مسودة (مخفي)</option>
          </select>
        </section>

        <section className="card space-y-3 p-4">
          <h2 className="text-sm font-semibold">التنظيم</h2>
          <Field label="نوع المنتج" hint="يظهر كعامل تصفية في صفحة المنتجات">
            <input name="category" list="cats" defaultValue={product?.category ?? ""} className="input" placeholder={placeholders.type} />
            <datalist id="cats">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <div className="space-y-1.5">
            <div className="text-sm font-semibold">المجموعات</div>
            {collections.length === 0 ? (
              <p className="text-xs text-muted">
                لا توجد مجموعات.{" "}
                <Link href="/dashboard/collections/new" className="text-[#005bd3]">
                  أنشئ مجموعة
                </Link>
              </p>
            ) : (
              collections.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-[13px]">
                  <input type="checkbox" name="collection_ids" value={c.id} defaultChecked={product?.collection_ids?.includes(c.id)} className="h-4 w-4 accent-black" />
                  {c.title}
                </label>
              ))
            )}
          </div>
        </section>

      </div>

      <SaveRow state={state}>حفظ المنتج</SaveRow>
    </form>
  );
}
