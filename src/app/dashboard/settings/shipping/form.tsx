"use client";

import { useActionState, useState } from "react";
import { Field, FormMessage, SubmitButton } from "@/components/form-ui";
import type { ShippingSettings } from "@/lib/types";
import { saveShipping } from "./actions";

const CITIES = ["دمشق", "ريف دمشق", "حلب", "حمص", "حماة", "اللاذقية", "طرطوس", "إدلب", "درعا", "السويداء", "القنيطرة", "دير الزور", "الرقة", "الحسكة"];

export function ShippingForm({ initial, currency }: { initial: ShippingSettings; currency: string }) {
  const [state, action] = useActionState(saveShipping, undefined);
  const [rates, setRates] = useState<{ city: string; fee: string }[]>((initial.rates ?? []).map((r) => ({ city: r.city, fee: String(r.fee) })));
  const unit = currency === "SYP" ? "ل.س" : "$";
  const missing = CITIES.filter((c) => !rates.some((r) => r.city === c));

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="rates" value={JSON.stringify(rates)} />
      <section className="card space-y-3 p-4">
        <h2 className="text-sm font-semibold">سعر التوصيل حسب المدينة</h2>
        <p className="text-[13px] text-muted">الزبون بيختار مدينته بالسلة، وبيظهر سعر التوصيل تلقائياً. المدن اللي مش بالقائمة بياخدوا السعر العام تحت.</p>
        {rates.length > 0 && (
          <ul className="divide-y divide-black/5 rounded-lg border border-black/10">
            {rates.map((r, i) => (
              <li key={i} className="flex items-center gap-2 p-2">
                <input className="input flex-1" value={r.city} onChange={(e) => setRates(rates.map((x, j) => (j === i ? { ...x, city: e.target.value } : x)))} />
                <input
                  className="input !w-28"
                  dir="ltr"
                  inputMode="decimal"
                  placeholder={unit}
                  value={r.fee}
                  onChange={(e) => setRates(rates.map((x, j) => (j === i ? { ...x, fee: e.target.value } : x)))}
                />
                <span className="text-xs text-muted">{unit}</span>
                <button type="button" className="px-2 text-muted hover:text-red-700" onClick={() => setRates(rates.filter((_, j) => j !== i))} aria-label="احذف">
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap gap-1.5">
          {missing.map((c) => (
            <button key={c} type="button" className="rounded-lg border border-black/10 px-2.5 py-1 text-[13px] hover:bg-[#f7f7f7]" onClick={() => setRates([...rates, { city: c, fee: "" }])}>
              + {c}
            </button>
          ))}
          <button type="button" className="rounded-lg border border-dashed border-black/20 px-2.5 py-1 text-[13px]" onClick={() => setRates([...rates, { city: "", fee: "" }])}>
            + مدينة أو منطقة تانية
          </button>
        </div>
        <p className="text-xs text-muted">حط 0 للمدن اللي التوصيل فيها مجاني.</p>
      </section>

      <section className="card grid gap-3 p-4 sm:grid-cols-2">
        <Field label={`السعر العام للتوصيل (${unit})`} hint="للمدن اللي مش بالقائمة. اتركه فاضي إذا مجاني">
          <input name="default_fee" inputMode="decimal" defaultValue={initial.default_fee ?? ""} className="input" dir="ltr" />
        </Field>
        <Field label={`توصيل مجاني للطلبات فوق (${unit})`} hint="اختياري، مثلاً 50">
          <input name="free_over" inputMode="decimal" defaultValue={initial.free_over ?? ""} className="input" dir="ltr" />
        </Field>
      </section>

      <FormMessage state={state} />
      <SubmitButton>احفظ</SubmitButton>
    </form>
  );
}
