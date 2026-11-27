"use client";

import { useActionState } from "react";
import { Field, FormMessage, SubmitButton } from "@/components/form-ui";
import { paySupplier, saveSupplier } from "../actions";

export function SupplierForm({ supplier }: { supplier?: { id: string; name: string; phone: string | null; note: string | null } }) {
  const [state, action] = useActionState(saveSupplier, undefined);
  return (
    <form action={action} className="space-y-3">
      {supplier && <input type="hidden" name="id" value={supplier.id} />}
      <Field label="اسم المورد">
        <input name="name" required maxLength={80} defaultValue={supplier?.name} className="input" placeholder="مثال: شركة الفيحاء للمواد الغذائية" />
      </Field>
      <Field label="الهاتف (اختياري)">
        <input name="phone" defaultValue={supplier?.phone ?? ""} inputMode="tel" className="input" dir="ltr" />
      </Field>
      <Field label="ملاحظة (اختياري)">
        <input name="note" defaultValue={supplier?.note ?? ""} maxLength={300} className="input" />
      </Field>
      <FormMessage state={state} />
      <SubmitButton>{supplier ? "احفظ" : "أضف المورد"}</SubmitButton>
    </form>
  );
}

export function PayForm({
  supplierId,
  owed,
  today,
  paidFrom,
  branches,
}: {
  supplierId: string;
  owed: number;
  today: string;
  paidFrom: Record<string, string>;
  branches: { id: string; name: string }[];
}) {
  const [state, action] = useActionState(paySupplier, undefined);
  return (
    <form action={action} key={state?.ok ?? "p"} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="supplier_id" value={supplierId} />
      <Field label="المبلغ">
        <input name="amount" required inputMode="decimal" className="input" dir="ltr" placeholder={owed > 0 ? String(owed) : ""} />
      </Field>
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
      {branches.length > 1 ? (
        <Field label="الفرع">
          <select name="branch" className="input">
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </Field>
      ) : (
        <Field label="ملاحظة (اختياري)">
          <input name="note" maxLength={300} className="input" />
        </Field>
      )}
      <div className="space-y-2 sm:col-span-2">
        <FormMessage state={state} />
        <SubmitButton>سجّل الدفعة</SubmitButton>
      </div>
    </form>
  );
}
