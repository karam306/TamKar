"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field, FormMessage, SubmitButton } from "@/components/form-ui";
import { login } from "../actions";

export default function LoginPage() {
  const [state, action] = useActionState(login, undefined);
  return (
    <form action={action} className="flex flex-col gap-4">
      <h1 className="text-2xl">تسجيل الدخول</h1>
      <Field label="البريد الإلكتروني">
        <input name="email" type="email" required className="input" dir="ltr" autoComplete="email" />
      </Field>
      <Field label="كلمة المرور">
        <input name="password" type="password" required className="input" dir="ltr" autoComplete="current-password" />
      </Field>
      <FormMessage state={state} />
      <SubmitButton pendingText="جارٍ الدخول...">دخول</SubmitButton>
      <Link href="/forgot" className="text-center text-sm text-muted hover:text-primary">
        نسيت كلمة المرور؟
      </Link>
      <p className="text-center text-sm text-muted">
        ليس لديك متجر؟{" "}
        <Link href="/signup" className="text-primary">
          أنشئ متجرك
        </Link>
      </p>
    </form>
  );
}
