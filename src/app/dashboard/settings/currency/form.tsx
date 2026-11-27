"use client";

import { useActionState, useState } from "react";
import { Field, FormMessage, SubmitButton } from "@/components/form-ui";
import { FX_ROUND_STEPS, money, type Fx } from "@/lib/fx";
import { saveFx } from "./actions";

const ROUND_LABEL: Record<number, string> = {
  1: "دون تقريب",
  5: "لأقرب 5 ليرات",
  10: "لأقرب 10 ليرات",
  50: "لأقرب 50 ليرة",
  100: "لأقرب 100 ليرة",
  500: "لأقرب 500 ليرة",
};

/** Full form (settings page) or `compact` (dashboard home card: the rate only). */
export function FxForm({ fx, sample, compact = false }: { fx: Fx | null; sample: number; compact?: boolean }) {
  const [state, action] = useActionState(saveFx, undefined);
  const [rate, setRate] = useState(fx ? String(fx.rate) : "");
  const [round, setRound] = useState(fx?.round ?? 5);
  const [show, setShow] = useState<Fx["show"]>(fx?.show ?? "syp");
  const r = Number(rate.replace(/[,\s]/g, ""));
  const preview = r > 0 ? money("USD", { rate: r, round, show }).price(sample) : null;

  return (
    <form action={action} className="space-y-4">
      <div className={compact ? "flex flex-wrap items-end gap-3" : "grid gap-4 sm:grid-cols-2"}>
        <Field label={compact ? "ليرة سورية مقابل دولار واحد" : "سعر الدولار اليوم"} hint={compact ? undefined : "بالليرة السورية الجديدة. اتركه فارغاً لعرض الأسعار بالدولار."}>
          <input name="rate" className="input" dir="ltr" inputMode="decimal" placeholder="مثلاً 115" value={rate} onChange={(e) => setRate(e.target.value)} />
        </Field>
        {compact ? (
          <>
            <input type="hidden" name="round" value={round} />
            <input type="hidden" name="show" value={show} />
            <SubmitButton>تحديث</SubmitButton>
          </>
        ) : (
          <Field label="تقريب الأسعار" hint="يُقرَّب السعر إلى الأعلى دائماً">
            <select name="round" className="input" value={round} onChange={(e) => setRound(Number(e.target.value))}>
              {FX_ROUND_STEPS.map((s) => (
                <option key={s} value={s}>{ROUND_LABEL[s]}</option>
              ))}
            </select>
          </Field>
        )}
      </div>
      {!compact && (
        <fieldset className="space-y-2 text-sm">
          <legend className="mb-1 font-semibold">ما يراه الزبون</legend>
          <label className="flex items-center gap-2">
            <input type="radio" name="show" value="syp" checked={show === "syp"} onChange={() => setShow("syp")} />
            السعر بالليرة فقط
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="show" value="both" checked={show === "both"} onChange={() => setShow("both")} />
            السعر بالليرة، وبجانبه السعر بالدولار
          </label>
        </fieldset>
      )}
      {preview && (
        <p className="rounded-lg bg-black/[0.04] px-3 py-2 text-[13px]">
          منتج سعره ${sample} يظهر للزبون: <b>{preview}</b>
        </p>
      )}
      <FormMessage state={state} />
      {!compact && <SubmitButton>حفظ سعر الصرف</SubmitButton>}
    </form>
  );
}
