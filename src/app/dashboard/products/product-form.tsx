"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Field, FormMessage, SubmitButton } from "@/components/form-ui";
import { ImageUploader } from "@/components/image-uploader";
import type { Collection, Product } from "@/lib/types";
import { saveProduct, uploadImage } from "./actions";
import { VariantEditor } from "./variant-editor";

export function ProductForm({
  product,
  currency,
  categories,
  collections,
}: {
  product?: Product;
  currency: string;
  categories: string[];
  collections: Collection[];
}) {
  const [state, action] = useActionState(saveProduct, undefined);
  const [withVariants, setWithVariants] = useState((product?.options?.length ?? 0) > 0);
  const [price, setPrice] = useState(product?.price != null ? String(product.price) : "");
  const unit = currency === "SYP" ? "ل.س" : "$";

  return (
    <form action={action} className="grid items-start gap-4 lg:grid-cols-[1fr_300px]">
      <input type="hidden" name="id" value={product?.id ?? ""} />

      <div className="space-y-4">
        <section className="card space-y-3 p-4">
          <Field label="العنوان">
            <input name="title" required defaultValue={product?.title} maxLength={200} className="input" placeholder="مثلاً: طقم صحون سيراميك 18 قطعة" />
          </Field>
          <Field label="الوصف">
            <textarea name="description" rows={6} defaultValue={product?.description ?? ""} className="input" placeholder="المقاسات، الخامة، طريقة الاستعمال..." />
          </Field>
          <ImageUploader name="images" initial={product?.images ?? []} upload={uploadImage} max={10} label="الصور" />
        </section>

        {!withVariants && (
          <>
            <section className="card space-y-3 p-4">
              <h2 className="text-sm font-semibold">السعر</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={`السعر (${unit})`}>
                  <input name="price" required inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} className="input" dir="ltr" />
                </Field>
                <Field label={`السعر قبل الخصم (${unit})`} hint="بيبين مشطوب جنب السعر">
                  <input name="compare_at_price" inputMode="decimal" defaultValue={product?.compare_at_price ?? ""} className="input" dir="ltr" />
                </Field>
              </div>
            </section>
            <section className="card space-y-3 p-4">
              <h2 className="text-sm font-semibold">المخزون</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="الكمية المتوفرة" hint="اتركها فاضية إذا الكمية مفتوحة. بتنقص تلقائياً مع كل طلب">
                  <input name="stock" inputMode="numeric" defaultValue={product?.stock ?? ""} className="input" dir="ltr" />
                </Field>
                <Field label="SKU (رمز المنتج)">
                  <input name="sku" defaultValue={product?.sku ?? ""} className="input" dir="ltr" />
                </Field>
              </div>
            </section>
          </>
        )}

        <section className="card space-y-3 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">الخيارات</h2>
            {withVariants && <span className="text-xs text-muted">كل خيار إله سعر وكمية خاصين فيه</span>}
          </div>
          {withVariants ? (
            <>
              <input type="hidden" name="price" value={price || "0"} />
              <VariantEditor initialOptions={product?.options ?? []} initialVariants={product?.variants ?? []} basePrice={price} />
            </>
          ) : (
            <button type="button" className="text-[13px] font-semibold text-[#005bd3] hover:underline" onClick={() => setWithVariants(true)}>
              + هالمنتج إله خيارات، مثل المقاس أو اللون
            </button>
          )}
        </section>
      </div>

      <div className="space-y-4">
        <section className="card space-y-2 p-4">
          <h2 className="text-sm font-semibold">الحالة</h2>
          <select name="status" defaultValue={product && !product.active ? "draft" : "active"} className="input">
            <option value="active">نشط (ظاهر بالمتجر)</option>
            <option value="draft">مسودة (مخفي)</option>
          </select>
        </section>

        <section className="card space-y-3 p-4">
          <h2 className="text-sm font-semibold">التنظيم</h2>
          <Field label="نوع المنتج" hint="بيظهر كفلتر بصفحة المنتجات">
            <input name="category" list="cats" defaultValue={product?.category ?? ""} className="input" placeholder="مثلاً: صحون" />
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
                ما عندك مجموعات.{" "}
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

        <div className="sticky bottom-3 space-y-2">
          <FormMessage state={state} />
          <SubmitButton className="w-full">احفظ</SubmitButton>
        </div>
      </div>
    </form>
  );
}
