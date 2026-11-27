"use client";

import { useActionState, useState } from "react";
import { Field, FormMessage, SubmitButton } from "@/components/form-ui";
import { addExpense } from "../actions";

export function ExpenseForm({
  categories,
  paidFrom,
  branches,
  today,
  unit,
}: {
  categories: string[];
  paidFrom: Record<string, string>;
  branches: { id: string; name: string }[];
  today: string;
  unit: string;
}) {
  const [state, action] = useActionState(addExpense, undefined);
  const [cat, setCat] = useState(categories[0]);
  return (
    <form action={action} key={state?.ok ?? "f"} className="grid gap-3 sm:grid-cols-2">
      <Field label={`المبلغ (${unit})`}>
        <input name="amount" required inputMode="decimal" className="input" dir="ltr" />
      </Field>
      <Field label="النوع">
        <select name="category" className="input" value={cat} onChange={(e) => setCat(e.target.value)}>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </Field>
      {cat === "أخرى" && (
        <Field label="اكتب النوع">
          <input name="other" maxLength={40} className="input" placeholder="مثال: ضيافة" />
        </Field>
      )}
      <Field label="التاريخ">
        <input name="day" type="date" defaultValue={today} max={today} className="input" dir="ltr" />
      </Field>
      <Field label="دُفع من">
        <select name="paid_from" className="input" defaultValue="cash">
          {Object.entries(paidFrom).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </Field>
      {branches.length > 1 && (
        <Field label="الفرع">
          <select name="branch" className="input">
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </Field>
      )}
      <Field label="ملاحظة (اختياري)">
        <input name="note" maxLength={300} className="input" placeholder="مثال: إيجار شهر تشرين الثاني" />
      </Field>
      <label className="flex items-center gap-2 text-[13px] sm:col-span-2">
        <input type="checkbox" name="repeat" value="1" className="h-4 w-4 accent-black" />
        يتكرر كل شهر في اليوم نفسه (مثل الإيجار والرواتب)
      </label>
      <div className="space-y-2 sm:col-span-2">
        <FormMessage state={state} />
        <SubmitButton>سجّل المصروف</SubmitButton>
      </div>
    </form>
  );
}
