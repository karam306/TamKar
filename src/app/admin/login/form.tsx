"use client";

import { useActionState } from "react";
import { Field, FormMessage, SubmitButton } from "@/components/form-ui";
import { adminLogin } from "./actions";

export function AdminLoginForm() {
  const [state, action] = useActionState(adminLogin, undefined);
  return (
    <form action={action} className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">دخول المدير</h1>
      <Field label="البريد الإلكتروني">
        <input name="email" type="email" required className="input" dir="ltr" autoComplete="username" autoFocus />
      </Field>
      <Field label="كلمة المرور">
        <input name="password" type="password" required className="input" dir="ltr" autoComplete="current-password" />
      </Field>
      <FormMessage state={state} />
      <SubmitButton pendingText="جارٍ الدخول...">دخول</SubmitButton>
    </form>
  );
}
