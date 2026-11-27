"use client";

import { useActionState } from "react";
import { FormMessage, SubmitButton } from "@/components/form-ui";
import { addPayment } from "./actions";

export function PayForm({ orderId, due }: { orderId: string; due: number }) {
  const [state, action] = useActionState(addPayment, undefined);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="id" value={orderId} />
      <div className="flex flex-wrap gap-2">
        <input name="amount" className="input w-32" dir="ltr" inputMode="decimal" placeholder={String(due)} required />
        <select name="method" className="input w-auto" defaultValue="cash" aria-label="طريقة الدفع">
          <option value="cash">نقداً</option>
          <option value="sham_cash">شام كاش</option>
          <option value="syriatel_cash">سيريتل كاش</option>
          <option value="mtn_cash">MTN كاش</option>
          <option value="bank">حساب بنكي</option>
        </select>
        <input name="note" className="input min-w-0 flex-1" placeholder="ملاحظة (اختياري)" maxLength={200} />
        <SubmitButton>تسجيل دفعة</SubmitButton>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
