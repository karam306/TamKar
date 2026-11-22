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
      <Field label="الإيميل">
        <input name="email" type="email" required className="input" dir="ltr" autoComplete="email" />
      </Field>
      <Field label="كلمة السر">
        <input name="password" type="password" required className="input" dir="ltr" autoComplete="current-password" />
      </Field>
      <FormMessage state={state} />
      <SubmitButton pendingText="جاري الدخول...">دخول</SubmitButton>
      <Link href="/forgot" className="text-center text-sm text-muted hover:text-primary">
        نسيت كلمة السر؟
      </Link>
      <p className="text-center text-sm text-muted">
        ما عندك متجر؟{" "}
        <Link href="/signup" className="text-primary">
          افتح متجرك
        </Link>
      </p>
    </form>
  );
}
