"use client";

import { useActionState, useState } from "react";
import { Field, FormMessage, SubmitButton } from "@/components/form-ui";
import type { Discount } from "@/lib/types";
import { saveDiscount } from "./actions";

const day = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Damascus" }) : "");

export function DiscountForm({ discount, currency }: { discount?: Discount; currency: string }) {
  const [state, action] = useActionState(saveDiscount, undefined);
  const [method, setMethod] = useState(discount?.automatic ? "automatic" : "code");
  const [kind, setKind] = useState(discount?.kind ?? "percent");
  const unit = currency === "SYP" ? "ل.س" : "$";

  return (
    <form action={action} className="grid items-start gap-4 lg:grid-cols-[1fr_300px]">
      <input type="hidden" name="id" value={discount?.id ?? ""} />
      <div className="space-y-4">
        <section className="card space-y-3 p-4">
          <h2 className="text-sm font-semibold">طريقة الخصم</h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: "code", label: "كود خصم", hint: "الزبون بيكتبه بالسلة" },
              { id: "automatic", label: "خصم تلقائي", hint: "بيتطبق لحاله" },
            ].map((m) => (
              <label key={m.id} className={`cursor-pointer rounded-lg border-2 p-3 ${method === m.id ? "border-black" : "border-black/10"}`}>
                <input type="radio" name="method" value={m.id} checked={method === m.id} onChange={() => setMethod(m.id)} className="sr-only" />
                <div className="font-semibold">{m.label}</div>
                <div className="text-xs text-muted">{m.hint}</div>
              </label>
            ))}
          </div>
          {method === "code" ? (
            <Field label="الكود" hint="أحرف إنكليزية وأرقام، مثلاً EID20">
              <input name="code" required defaultValue={discount?.code ?? ""} className="input uppercase" dir="ltr" />
            </Field>
          ) : (
            <Field label="اسم الخصم" hint="بيظهر للزبون بالسلة، مثلاً: عرض الافتتاح">
              <input name="title" required defaultValue={discount?.title ?? ""} className="input" />
            </Field>
          )}
        </section>

        <section className="card space-y-3 p-4">
          <h2 className="text-sm font-semibold">قيمة الخصم</h2>
          <select name="kind" value={kind} onChange={(e) => setKind(e.target.value as Discount["kind"])} className="input">
            <option value="percent">نسبة مئوية (%)</option>
            <option value="fixed">مبلغ ثابت ({unit})</option>
            <option value="free_shipping">توصيل مجاني</option>
          </select>
          {kind !== "free_shipping" && (
            <Field label={kind === "percent" ? "النسبة %" : `المبلغ (${unit})`}>
              <input name="value" required inputMode="decimal" defaultValue={discount?.value ?? ""} className="input" dir="ltr" />
            </Field>
          )}
          <Field label={`أقل مبلغ للطلب (${unit})`} hint="اختياري. الخصم ما بيشتغل تحت هالمبلغ">
            <input name="min_subtotal" inputMode="decimal" defaultValue={discount?.min_subtotal ?? ""} className="input" dir="ltr" />
          </Field>
        </section>

        <section className="card space-y-3 p-4">
          <h2 className="text-sm font-semibold">المدة وعدد الاستخدامات</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="يبدأ من">
              <input type="date" name="starts_at" defaultValue={day(discount?.starts_at)} className="input" />
            </Field>
            <Field label="ينتهي بـ" hint="اختياري">
              <input type="date" name="ends_at" defaultValue={day(discount?.ends_at)} className="input" />
            </Field>
          </div>
          <Field label="عدد مرات الاستخدام الكلي" hint="اختياري. مثلاً 100 يعني أول 100 طلب بس">
            <input name="usage_limit" inputMode="numeric" defaultValue={discount?.usage_limit ?? ""} className="input" dir="ltr" />
          </Field>
        </section>
      </div>

      <div className="space-y-4">
        <section className="card space-y-2 p-4">
          <h2 className="text-sm font-semibold">الحالة</h2>
          <select name="active" defaultValue={discount && !discount.active ? "off" : "on"} className="input">
            <option value="on">فعّال</option>
            <option value="off">متوقف</option>
          </select>
          {discount && <p className="text-xs text-muted">انستخدم {discount.used_count} مرة</p>}
        </section>
        <FormMessage state={state} />
        <SubmitButton className="w-full">احفظ الخصم</SubmitButton>
      </div>
    </form>
  );
}
