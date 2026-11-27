"use client";

import { useActionState } from "react";
import { FormMessage, SubmitButton } from "@/components/form-ui";
import { metaTest } from "@/app/admin/meta-actions";

export function TestButton() {
  const [state, action] = useActionState(metaTest, undefined);
  return (
    <form action={action} className="space-y-2">
      <SubmitButton pendingText="جارٍ الاختبار..." className="btn-outline">
        اختبار الاتصال
      </SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
