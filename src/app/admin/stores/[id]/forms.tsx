"use client";

import { useActionState } from "react";
import { FormMessage, SubmitButton } from "@/components/form-ui";
import { recordPayment, resetPassword } from "../../actions";

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
        <option value="pro">متقدم (متجر + إعلانات)</option>
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
