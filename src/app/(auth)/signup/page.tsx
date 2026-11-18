"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Field, FormMessage, SubmitButton } from "@/components/form-ui";
import { signup } from "../actions";

const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN;

export default function SignupPage() {
  const [state, action] = useActionState(signup, undefined);
  const [slug, setSlug] = useState("");
  return (
    <form action={action} className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl">افتح متجرك</h1>
        <p className="mt-1 text-sm text-muted">دقيقة وحدة ومتجرك بيصير جاهز.</p>
      </div>
      <Field label="اسم المتجر">
        <input name="store_name" required maxLength={80} className="input" placeholder="مثلاً: بيت المطبخ" />
      </Field>
      <Field label="رابط المتجر" hint={<>متجرك رح يفتح على: <bdi dir="ltr">{root ? `${slug || "mystore"}.${root}` : `/s/${slug || "mystore"}`}</bdi></>}>
        <input
          name="slug"
          required
          dir="ltr"
          className="input"
          placeholder="mystore"
          value={slug}
          onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
        />
      </Field>
      <Field label="رقم واتساب لاستقبال الطلبات" hint="مثال: 0912345678">
        <input name="whatsapp" required inputMode="tel" className="input" dir="ltr" style={{ textAlign: "right" }} />
      </Field>
      <Field label="المدينة">
        <input name="city" className="input" placeholder="دمشق، حمص، حلب..." />
      </Field>
      <Field label="الإيميل">
        <input name="email" type="email" required className="input" dir="ltr" autoComplete="email" />
      </Field>
      <Field label="كلمة السر" hint="8 أحرف على الأقل">
        <input name="password" type="password" required minLength={8} className="input" dir="ltr" autoComplete="new-password" />
      </Field>
      <FormMessage state={state} />
      <SubmitButton pendingText="جاري إنشاء المتجر...">أنشئ متجري</SubmitButton>
      <p className="text-center text-sm text-muted">
        عندك حساب؟{" "}
        <Link href="/login" className="text-primary">
          سجّل دخول
        </Link>
      </p>
    </form>
  );
}
