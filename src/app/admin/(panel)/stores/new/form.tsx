"use client";

import Link from "next/link";
import { useActionState, useState, useSyncExternalStore } from "react";
import { Field, FormMessage, SubmitButton } from "@/components/form-ui";
import { BUSINESS_TYPES } from "@/lib/business-types";
import { createMerchant } from "@/app/admin/actions";

const noop = () => () => {};

export function NewMerchantForm() {
  const [state, action] = useActionState(createMerchant, undefined);
  const [slug, setSlug] = useState("");
  const [plan, setPlan] = useState("trial");
  const origin = useSyncExternalStore(noop, () => window.location.origin, () => "");

  if (state?.created) {
    const c = state.created;
    const msg = `أهلاً بك بـ نمى 🎉\nمتجرك "${c.name}" صار جاهز.\n\nرابط متجرك: ${origin}/s/${c.slug}\nلوحة التحكم: ${origin}/login\nالإيميل: ${c.email}\nكلمة السر: ${c.password}\n\nفيك تغيّر كلمة السر بعد أول دخول.`;
    return (
      <div className="card max-w-xl space-y-4 p-5">
        <h2 className="text-lg font-semibold">✓ انعمل المتجر</h2>
        <p className="text-[13px] text-muted">ابعت هالمعلومات للتاجر. كلمة السر ما رح تظهر مرة تانية (بتقدر تعمل وحدة جديدة من صفحة المتجر).</p>
        <pre className="whitespace-pre-wrap rounded-lg bg-[#f7f7f7] p-3 text-[13px] leading-6">{msg}</pre>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn" onClick={() => navigator.clipboard.writeText(msg).catch(() => {})}>
            انسخ الرسالة
          </button>
          <a href={`https://wa.me/?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener noreferrer" className="btn !bg-[#25D366]">
            ابعتها على واتساب
          </a>
          <Link href={`/admin/stores/${c.id}`} className="btn btn-outline">
            صفحة المتجر
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="grid items-start gap-4 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <section className="card space-y-3 p-4">
          <h2 className="text-sm font-semibold">المتجر</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="اسم المتجر">
              <input name="store_name" required className="input" />
            </Field>
            <Field label="الرابط" hint={<bdi dir="ltr">/s/{slug || "..."}</bdi>}>
              <input name="slug" required dir="ltr" className="input" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} />
            </Field>
            <Field label="نوع النشاط">
              <select name="business_type" required defaultValue="" className="input">
                <option value="" disabled>
                  اختار
                </option>
                {BUSINESS_TYPES.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="العملة">
              <select name="currency" className="input">
                <option value="USD">دولار</option>
                <option value="SYP">ليرة سورية</option>
              </select>
            </Field>
            <Field label="واتساب الطلبات" hint="مثال 0912345678">
              <input name="whatsapp" required dir="ltr" inputMode="tel" className="input" />
            </Field>
            <Field label="المدينة">
              <input name="city" className="input" />
            </Field>
          </div>
        </section>
        <section className="card space-y-3 p-4">
          <h2 className="text-sm font-semibold">صاحب المتجر</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="الاسم">
              <input name="owner_name" className="input" />
            </Field>
            <Field label="رقم الهاتف">
              <input name="owner_phone" dir="ltr" className="input" />
            </Field>
            <Field label="إيميل الدخول">
              <input name="email" type="email" required dir="ltr" className="input" />
            </Field>
            <Field label="كلمة السر" hint="اتركها فاضية لننشئ وحدة تلقائياً">
              <input name="password" dir="ltr" className="input" autoComplete="new-password" />
            </Field>
          </div>
          <Field label="ملاحظات خاصة فيك" hint="ما بيشوفها التاجر">
            <textarea name="note" rows={2} className="input" />
          </Field>
        </section>
      </div>
      <div className="space-y-4">
        <section className="card space-y-3 p-4">
          <h2 className="text-sm font-semibold">الاشتراك</h2>
          <select name="plan" value={plan} onChange={(e) => setPlan(e.target.value)} className="input">
            <option value="trial">تجريبي (14 يوم)</option>
            <option value="basic">أساسي</option>
            <option value="pro">احترافي</option>
          </select>
          {plan !== "trial" && (
            <Field label="مدفوع لكم شهر" hint="0 يعني بدون تاريخ انتهاء">
              <input name="months" type="number" min={0} max={36} defaultValue={1} className="input" />
            </Field>
          )}
        </section>
        <FormMessage state={state?.error ? { error: state.error } : undefined} />
        <SubmitButton className="w-full" pendingText="جاري الإنشاء...">
          أنشئ المتجر والحساب
        </SubmitButton>
      </div>
    </form>
  );
}
