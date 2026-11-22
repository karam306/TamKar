"use client";

import { useActionState } from "react";
import { Field, FormMessage, SubmitButton } from "@/components/form-ui";
import { saveMeta } from "./actions";

export function MetaForm({ pixel, hasToken }: { pixel: string; hasToken: boolean }) {
  const [state, action] = useActionState(saveMeta, undefined);
  return (
    <form action={action} className="space-y-3">
      <Field label="Pixel ID (Dataset ID)" hint="من Events Manager: اختر البيكسل، ويظهر الرقم أسفل اسمه">
        <input name="pixel" defaultValue={pixel} className="input" dir="ltr" inputMode="numeric" placeholder="123456789012345" />
      </Field>
      <Field
        label="Conversions API access token"
        hint={hasToken ? "✓ يوجد رمز محفوظ. اترك الحقل فارغاً للإبقاء عليه" : "من Events Manager: البيكسل ثم Settings ثم Conversions API ثم Generate access token"}
      >
        <input name="token" type="password" autoComplete="off" className="input" dir="ltr" placeholder={hasToken ? "••••••••••••" : ""} />
      </Field>
      {hasToken && (
        <label className="flex items-center gap-2 text-[13px] text-muted">
          <input type="checkbox" name="clear_token" className="h-4 w-4 accent-black" /> حذف الرمز المحفوظ
        </label>
      )}
      <FormMessage state={state} />
      <SubmitButton>حفظ</SubmitButton>
    </form>
  );
}
