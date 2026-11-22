"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/form-ui";
import { importProducts } from "./actions";

export function ImportForm() {
  const [state, action] = useActionState(importProducts, undefined);
  return (
    <form action={action} className="space-y-3">
      <input
        type="file"
        name="file"
        required
        accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
        className="block w-full rounded-lg border border-dashed border-black/20 p-4 text-[13px] file:ml-3 file:rounded-lg file:border-0 file:bg-[#303030] file:px-3 file:py-1.5 file:text-white"
      />
      <SubmitButton pendingText="جارٍ الاستيراد... (قد يستغرق دقيقة)">استيراد المنتجات</SubmitButton>
      {state?.error && <p className="rounded-lg bg-red-50 p-3 text-[13px] text-red-700">{state.error}</p>}
      {state?.ok && <p className="rounded-lg bg-green-50 p-3 text-[13px] text-green-800">{state.ok}</p>}
      {state?.problems && state.problems.length > 0 && (
        <div className="rounded-lg bg-amber-50 p-3 text-[13px] text-amber-900">
          <div className="mb-1 font-semibold">سطور لم تُضَف:</div>
          <ul className="list-inside list-disc">
            {state.problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      )}
    </form>
  );
}
