"use client";

import { useActionState } from "react";
import { Field, FormMessage, SubmitButton } from "@/components/form-ui";
import { cancelMetaHelp, requestMetaHelp } from "./actions";

export function RequestForm({ pageUrl }: { pageUrl: string }) {
  const [state, action] = useActionState(requestMetaHelp, undefined);
  return (
    <form action={action} className="space-y-3">
      <Field label="رابط صفحة متجرك على فيسبوك أو إنستغرام" hint="اختياري، يساعدنا على الوصول إلى الصفحة الصحيحة">
        <input name="page_url" defaultValue={pageUrl} className="input" dir="ltr" placeholder="https://facebook.com/..." />
      </Field>
      <FormMessage state={state} />
      <SubmitButton pendingText="جارٍ الإرسال...">اطلب الربط من فريق كُن</SubmitButton>
    </form>
  );
}

export function CancelRequest() {
  const [state, action] = useActionState(cancelMetaHelp, undefined);
  return (
    <form action={action}>
      <SubmitButton pendingText="..." className="btn-outline">
        إلغاء الطلب
      </SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
