"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field, FormMessage, SubmitButton } from "@/components/form-ui";
import { requestResetCode, resetWithCode } from "./actions";

export function ForgotForm({ support }: { support: string | null }) {
  const [asked, ask] = useActionState(requestResetCode, undefined);
  const [done, reset] = useActionState(resetWithCode, undefined);
  const state = done ?? asked;
  const email = state?.email ?? "";
  const help = support
    ? `https://wa.me/${support}?text=${encodeURIComponent(`مرحباً، نسيت كلمة المرور لحسابي على نمى${email ? ` (${email})` : ""}`)}`
    : null;

  if (state?.step !== "code") {
    return (
      <form action={ask} className="flex flex-col gap-4">
        <h1 className="text-2xl">نسيت كلمة المرور</h1>
        <p className="text-sm text-muted">أدخل البريد الإلكتروني لحسابك. إذا كان متجرك مرتبطاً بتيليغرام، فسيصلك رمز هناك.</p>
        <Field label="البريد الإلكتروني">
          <input name="email" type="email" required defaultValue={email} className="input" dir="ltr" autoComplete="email" />
        </Field>
        <FormMessage state={asked?.error ? { error: asked.error } : undefined} />
        <SubmitButton pendingText="...">أرسل الرمز</SubmitButton>
        <Link href="/login" className="text-center text-sm text-primary">
          العودة إلى تسجيل الدخول
        </Link>
      </form>
    );
  }

  return (
    <form action={reset} className="flex flex-col gap-4">
      <h1 className="text-2xl">كلمة مرور جديدة</h1>
      <p className="text-sm text-muted">
        إذا كان متجرك مرتبطاً بتيليغرام، فقد أرسلنا إليك رمزاً من 6 أرقام صالحاً لمدة 15 دقيقة.
      </p>
      <input type="hidden" name="email" value={email} />
      <Field label="الرمز">
        <input name="code" required inputMode="numeric" maxLength={6} className="input text-center text-2xl tracking-[0.4em]" dir="ltr" autoComplete="one-time-code" />
      </Field>
      <Field label="كلمة المرور الجديدة" hint="8 أحرف على الأقل">
        <input name="password" type="password" required minLength={8} className="input" dir="ltr" autoComplete="new-password" />
      </Field>
      <FormMessage state={done?.error ? { error: done.error } : undefined} />
      <SubmitButton pendingText="...">غيّر كلمة المرور وادخل</SubmitButton>
      <div className="rounded-theme bg-surface p-3 text-center text-sm">
        <p className="mb-2 text-muted">لم يصلك الرمز؟ ربما لم يُربط تيليغرام بمتجرك.</p>
        {help && (
          <a href={help} target="_blank" rel="noopener noreferrer" className="btn w-full !bg-[#25D366]">
            راسلنا عبر واتساب وسنساعدك
          </a>
        )}
      </div>
    </form>
  );
}
