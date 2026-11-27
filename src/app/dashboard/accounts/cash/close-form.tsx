"use client";

import { useActionState, useState } from "react";
import { Field, FormMessage, SubmitButton } from "@/components/form-ui";
import { closeCash } from "../actions";

/** Count the drawer, compare with what the system expects, save the day. */
export function CloseForm({
  day,
  branch,
  opening: openingStart,
  movement,
  details,
  unit,
  closed,
}: {
  day: string;
  branch: string;
  opening: number;
  movement: number;
  details: unknown;
  unit: string;
  closed: { counted: number; note: string | null } | null;
}) {
  const [state, action] = useActionState(closeCash, undefined);
  const [opening, setOpening] = useState(String(openingStart));
  const [counted, setCounted] = useState(closed ? String(closed.counted) : "");
  const o = Number(opening) || 0;
  const expected = Math.round((o + movement) * 100) / 100;
  const diff = counted.trim() === "" ? null : Math.round((Number(counted) - expected) * 100) / 100;
  const fmt = (n: number) => `${n.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${unit}`;

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="day" value={day} />
      <input type="hidden" name="branch" value={branch} />
      <input type="hidden" name="expected" value={expected} />
      <input type="hidden" name="details" value={JSON.stringify(details)} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={`رصيد البداية (${unit})`} hint="ما كان في الصندوق صباحاً. يُؤخذ من إغلاق اليوم السابق.">
          <input name="opening" inputMode="decimal" value={opening} onChange={(e) => setOpening(e.target.value)} className="input" dir="ltr" />
        </Field>
        <Field label={`المبلغ الموجود الآن (${unit})`} hint="عُدّ النقود في الصندوق واكتب المجموع.">
          <input name="counted" required inputMode="decimal" value={counted} onChange={(e) => setCounted(e.target.value)} className="input" dir="ltr" />
        </Field>
      </div>
      <div className="rounded-lg bg-[#f7f7f7] p-3 text-[13px]">
        <div className="flex justify-between">
          <span>المفروض أن يكون في الصندوق</span>
          <b dir="ltr">{fmt(expected)}</b>
        </div>
        {diff !== null && (
          <div className={`mt-1 flex justify-between font-semibold ${diff === 0 ? "text-[#1a7f37]" : "text-red-700"}`}>
            <span>{diff === 0 ? "مطابق" : diff > 0 ? "زيادة" : "نقص"}</span>
            <span dir="ltr">{diff === 0 ? "" : fmt(Math.abs(diff))}</span>
          </div>
        )}
      </div>
      <Field label="ملاحظة (اختياري)">
        <input name="note" defaultValue={closed?.note ?? ""} maxLength={300} className="input" placeholder="مثال: الفرق بسبب فكّة ناقصة" />
      </Field>
      <FormMessage state={state} />
      <SubmitButton>{closed ? "حدّث إغلاق اليوم" : "أغلق الصندوق"}</SubmitButton>
    </form>
  );
}
