"use client";

import { FormMessage, SubmitButton } from "@/components/form-ui";
import { useActionState, useOptimistic, useTransition } from "react";
import { recordPayment, resetPassword, setPlan } from "@/app/admin/actions";

const PLAN_CHOICES = [
  { id: "basic", label: "أساسي", hint: "$15 · لغاية 100 منتج" },
  { id: "pro", label: "احترافي", hint: "$29 · كل الميزات" },
  { id: "trial", label: "تجريبي", hint: "كل الميزات مؤقتاً" },
];

/** Big, obvious plan buttons. The chosen one changes instantly. */
export function PlanSwitcher({ id, plan }: { id: string; plan: string }) {
  const [state, action] = useActionState(setPlan, undefined);
  const [shown, setShown] = useOptimistic(plan);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        {PLAN_CHOICES.map((p) => {
          const on = shown === p.id;
          return (
            <button
              key={p.id}
              type="button"
              disabled={pending || on}
              onClick={() =>
                start(() => {
                  setShown(p.id);
                  const f = new FormData();
                  f.set("id", id);
                  f.set("plan", p.id);
                  action(f);
                })
              }
              className={`rounded-lg border-2 p-3 text-center transition ${on ? "border-[#0b2b26] bg-[#0b2b26] text-white" : "border-black/10 bg-white hover:border-[#0b2b26]"}`}
            >
              <div className="text-[15px] font-bold">{p.label}</div>
              <div className={`text-[11px] ${on ? "opacity-80" : "text-muted"}`}>{p.hint}</div>
            </button>
          );
        })}
      </div>
      <FormMessage state={state} />
    </div>
  );
}

export function PaymentForm({ id, currency }: { id: string; currency: string }) {
  const [state, action] = useActionState(recordPayment, undefined);
  return (
    <form action={action} className="space-y-2 rounded-lg bg-[#f7f7f7] p-3 text-[13px]">
      <div className="font-semibold">سجّل دفعة اشتراك</div>
      <input type="hidden" name="id" value={id} />
      <div className="grid gap-2 sm:grid-cols-4">
        <input name="amount" required inputMode="decimal" placeholder="المبلغ" className="input" dir="ltr" />
        <select name="currency" defaultValue={currency} className="input">
          <option value="USD">دولار</option>
          <option value="SYP">ليرة</option>
        </select>
        <select name="months" defaultValue="1" className="input">
          {[1, 2, 3, 6, 12].map((m) => (
            <option key={m} value={m}>
              {m} {m === 1 ? "شهر" : m <= 10 ? "أشهر" : "شهر"}
            </option>
          ))}
        </select>
        <input name="method" placeholder="الطريقة (كاش، شام كاش...)" className="input" />
      </div>
      <select name="plan" defaultValue="" className="input">
        <option value="">نفس الباقة</option>
        <option value="basic">أساسي</option>
        <option value="pro">احترافي</option>
      </select>
      <input name="note" placeholder="ملاحظة (اختياري)" className="input" />
      <FormMessage state={state} />
      <SubmitButton pendingText="جاري التسجيل...">سجّل الدفعة ومدّد الاشتراك</SubmitButton>
    </form>
  );
}

export function ResetPassword({ id }: { id: string }) {
  const [state, action] = useActionState(resetPassword, undefined);
  return (
    <form action={action} className="space-y-2 text-[13px]">
      <input type="hidden" name="id" value={id} />
      <p className="text-muted">إذا التاجر نسي كلمة السر: اكتب وحدة جديدة، أو اتركها فاضية ومنعملك وحدة عشوائية.</p>
      <input name="password" dir="ltr" minLength={8} placeholder="كلمة سر جديدة (اختياري)" className="input" autoComplete="new-password" />
      {state?.password && (
        <div className="rounded-lg bg-[#f7f7f7] p-2">
          كلمة السر الجديدة:{" "}
          <b dir="ltr" className="select-all">
            {state.password}
          </b>
        </div>
      )}
      {state?.error && <p className="text-red-700">{state.error}</p>}
      <SubmitButton pendingText="...">غيّر كلمة السر</SubmitButton>
    </form>
  );
}
