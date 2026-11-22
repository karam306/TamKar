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
    ? `https://wa.me/${support}?text=${encodeURIComponent(`مرحبا، نسيت كلمة السر لحسابي على نمى${email ? ` (${email})` : ""}`)}`
    : null;

  if (state?.step !== "code") {
    return (
      <form action={ask} className="flex flex-col gap-4">
        <h1 className="text-2xl">نسيت كلمة السر</h1>
        <p className="text-sm text-muted">اكتب إيميل حسابك. إذا متجرك مربوط بتيليغرام، بيوصلك كود هونيك.</p>
        <Field label="الإيميل">
          <input name="email" type="email" required defaultValue={email} className="input" dir="ltr" autoComplete="email" />
        </Field>
        <FormMessage state={asked?.error ? { error: asked.error } : undefined} />
        <SubmitButton pendingText="...">ابعتلي كود</SubmitButton>
        <Link href="/login" className="text-center text-sm text-primary">
          رجوع لتسجيل الدخول
        </Link>
      </form>
    );
  }

  return (
    <form action={reset} className="flex flex-col gap-4">
      <h1 className="text-2xl">كلمة سر جديدة</h1>
      <p className="text-sm text-muted">
        إذا متجرك مربوط بتيليغرام، بعتنالك كود من 6 أرقام. الكود صالح لـ15 دقيقة.
      </p>
      <input type="hidden" name="email" value={email} />
      <Field label="الكود">
        <input name="code" required inputMode="numeric" maxLength={6} className="input text-center text-2xl tracking-[0.4em]" dir="ltr" autoComplete="one-time-code" />
      </Field>
      <Field label="كلمة السر الجديدة" hint="8 أحرف أو أكتر">
        <input name="password" type="password" required minLength={8} className="input" dir="ltr" autoComplete="new-password" />
      </Field>
      <FormMessage state={done?.error ? { error: done.error } : undefined} />
      <SubmitButton pendingText="...">غيّر كلمة السر وادخل</SubmitButton>
      <div className="rounded-theme bg-surface p-3 text-center text-sm">
        <p className="mb-2 text-muted">ما وصلك كود؟ يمكن تيليغرام مو مربوط بمتجرك.</p>
        {help && (
          <a href={help} target="_blank" rel="noopener noreferrer" className="btn w-full !bg-[#25D366]">
            راسلنا على واتساب ومنساعدك
          </a>
        )}
      </div>
    </form>
  );
}
