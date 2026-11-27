"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Field, FormMessage, SubmitButton } from "@/components/form-ui";
import type { Branch } from "@/lib/types";
import { saveBranches } from "./actions";

export function BranchesForm({
  initial,
  max,
  main,
}: {
  initial: Branch[];
  /** Extra branches allowed, not counting the main shop. */
  max: number;
  main: { name: string; whatsapp: string; note: string };
}) {
  const [branches, setBranches] = useState<Branch[]>(initial);
  const [state, action] = useActionState(saveBranches, undefined);
  const edit = (i: number, patch: Partial<Branch>) =>
    setBranches(branches.map((x, k) => (k === i ? { ...x, ...patch } : x)));

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="branches" value={JSON.stringify(branches)} />
      <p className="text-[13px] text-muted">
        يختار الزبون عند الطلب الفرع الذي يستلم منه، ويصل الطلب إلى واتساب ذلك الفرع مباشرة.
        يمكنك إضافة حتى {max} فروع إلى جانب المحل الرئيسي.
      </p>

      <section className="card space-y-1 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">المحل الرئيسي</h2>
          <span className="rounded-full bg-black/5 px-2 py-0.5 text-[12px]">الخيار الأول للزبون</span>
        </div>
        <p className="text-[13px]">{main.name}</p>
        <p className="text-[13px] text-muted">{main.note || "لم يُحدَّد مكان الاستلام بعد."}</p>
        <p className="text-[13px] text-muted" dir="ltr">{main.whatsapp}</p>
        <p className="pt-1 text-[13px]">
          <Link href="/dashboard/settings/shipping" className="font-semibold text-[#005bd3] hover:underline">
            تعديل مكان الاستلام
          </Link>
          <span className="mx-2 text-muted">·</span>
          <Link href="/dashboard/settings" className="font-semibold text-[#005bd3] hover:underline">
            تعديل رقم واتساب
          </Link>
        </p>
      </section>

      {branches.map((b, i) => (
        <section key={b.id || `new-${i}`} className="card space-y-3 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">الفرع {i + 2}</h2>
            <button
              type="button"
              className="text-[13px] text-muted hover:text-red-700"
              onClick={() => setBranches(branches.filter((_, k) => k !== i))}
            >
              حذف الفرع
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="اسم الفرع" hint="مثلاً: فرع المزة">
              <input className="input" maxLength={60} value={b.name} onChange={(e) => edit(i, { name: e.target.value })} />
            </Field>
            <Field label="رقم واتساب الفرع" hint="مع رمز الدولة، مثل 963912345678">
              <input className="input" dir="ltr" inputMode="tel" value={b.whatsapp} onChange={(e) => edit(i, { whatsapp: e.target.value })} />
            </Field>
          </div>
          <Field label="العنوان وأوقات الاستلام" hint="يظهر للزبون عند اختيار هذا الفرع">
            <input className="input" maxLength={200} value={b.note ?? ""} onChange={(e) => edit(i, { note: e.target.value })} />
          </Field>
        </section>
      ))}

      {branches.length < max && (
        <button
          type="button"
          className="card w-full p-4 text-sm font-semibold text-[#005bd3] hover:shadow-md"
          onClick={() => setBranches([...branches, { id: "", name: "", note: "", whatsapp: "" }])}
        >
          + إضافة فرع
        </button>
      )}

      <div className="flex items-center gap-3">
        <SubmitButton>حفظ الفروع</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
