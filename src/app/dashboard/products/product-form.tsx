"use client";

import { useActionState } from "react";
import { Field, FormMessage, SubmitButton } from "@/components/form-ui";
import { ImageUploader } from "@/components/image-uploader";
import type { Product } from "@/lib/types";
import { saveProduct, uploadImage } from "./actions";

export function ProductForm({ product, currency, categories }: { product?: Product; currency: string; categories: string[] }) {
  const [state, action] = useActionState(saveProduct, undefined);
  const unit = currency === "SYP" ? "ل.س" : "$";

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <input type="hidden" name="id" value={product?.id ?? ""} />
      <div className="space-y-4 rounded-theme bg-white p-5">
        <Field label="اسم المنتج">
          <input name="title" required defaultValue={product?.title} maxLength={200} className="input" placeholder="مثلاً: طقم صحون سيراميك 18 قطعة" />
        </Field>
        <Field label="الوصف" hint="اكتب المقاسات، الخامة، الألوان المتوفرة...">
          <textarea name="description" rows={5} defaultValue={product?.description ?? ""} className="input" />
        </Field>
        <ImageUploader name="images" initial={product?.images ?? []} upload={uploadImage} />
      </div>

      <div className="space-y-4">
        <div className="space-y-4 rounded-theme bg-white p-5">
          <Field label={`السعر (${unit})`}>
            <input name="price" required inputMode="decimal" defaultValue={product?.price} className="input" dir="ltr" />
          </Field>
          <Field label={`السعر قبل الخصم (${unit})`} hint="اختياري. إذا عبيته بيبين السعر القديم مشطوب">
            <input name="compare_at_price" inputMode="decimal" defaultValue={product?.compare_at_price ?? ""} className="input" dir="ltr" />
          </Field>
          <Field label="الكمية المتوفرة" hint="اتركها فاضية إذا الكمية مفتوحة">
            <input name="stock" inputMode="numeric" defaultValue={product?.stock ?? ""} className="input" dir="ltr" />
          </Field>
          <Field label="التصنيف" hint="مثلاً: صحون، فساتين، معمول">
            <input name="category" list="cats" defaultValue={product?.category ?? ""} className="input" />
            <datalist id="cats">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="active" defaultChecked={product?.active ?? true} className="h-4 w-4 accent-[var(--primary)]" />
            ظاهر بالمتجر
          </label>
        </div>
        <FormMessage state={state} />
        <SubmitButton className="w-full">{product ? "احفظ التعديلات" : "أضف المنتج"}</SubmitButton>
      </div>
    </form>
  );
}
