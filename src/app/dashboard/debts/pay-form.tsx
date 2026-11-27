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
        <input name="note" className="input min-w-0 flex-1" placeholder="ملاحظة (اختياري): نقداً، شام كاش..." maxLength={200} />
        <SubmitButton>تسجيل دفعة</SubmitButton>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
