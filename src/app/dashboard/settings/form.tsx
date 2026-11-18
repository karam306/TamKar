"use client";

import { useActionState } from "react";
import { Field, FormMessage, SubmitButton } from "@/components/form-ui";
import { saveSettings } from "./actions";

type S = { name: string; tagline: string; whatsapp: string; city: string; currency: string; delivery_note: string };

export function SettingsForm({ store }: { store: S }) {
  const [state, action] = useActionState(saveSettings, undefined);
  return (
    <form action={action} className="space-y-4 rounded-theme bg-white p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="اسم المتجر">
          <input name="name" required defaultValue={store.name} className="input" />
        </Field>
        <Field label="جملة تعريفية" hint="بتظهر تحت اسم المتجر وبنتائج البحث">
          <input name="tagline" defaultValue={store.tagline} className="input" />
        </Field>
        <Field label="رقم واتساب للطلبات" hint="الطلبات رح توصل على هالرقم">
          <input name="whatsapp" required defaultValue={store.whatsapp} inputMode="tel" className="input" dir="ltr" style={{ textAlign: "right" }} />
        </Field>
        <Field label="المدينة">
          <input name="city" defaultValue={store.city} className="input" />
        </Field>
        <Field label="العملة">
          <select name="currency" defaultValue={store.currency} className="input">
            <option value="USD">دولار ($)</option>
            <option value="SYP">ليرة سورية (ل.س)</option>
          </select>
        </Field>
        <Field label="معلومات التوصيل" hint="مثلاً: توصيل مجاني داخل حمص">
          <input name="delivery_note" defaultValue={store.delivery_note} className="input" />
        </Field>
      </div>
      <FormMessage state={state} />
      <SubmitButton>احفظ</SubmitButton>
    </form>
  );
}
