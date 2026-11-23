"use client";

import Link from "next/link";
import { useActionState, useState, useSyncExternalStore } from "react";
import { Field, SaveRow } from "@/components/form-ui";
import { BUSINESS_TYPES } from "@/lib/business-types";
import { createMerchant } from "@/app/admin/actions";

const noop = () => () => {};

export function NewMerchantForm({ salesmen = [] }: { salesmen?: { id: string; name: string; code: string }[] }) {
  const [state, action] = useActionState(createMerchant, undefined);
  const [slug, setSlug] = useState("");
  const [plan, setPlan] = useState("trial");
  const origin = useSyncExternalStore(noop, () => window.location.origin, () => "");

  if (state?.created) {
    const c = state.created;
    const msg = `أهلاً بك في منصة كُن.\nمتجرك "${c.name}" جاهز.\n\nرابط متجرك: ${origin}/s/${c.slug}\nلوحة التحكم: ${origin}/login\nالبريد الإلكتروني: ${c.email}\nكلمة المرور: ${c.password}\n\nيمكنك تغيير كلمة المرور بعد أول تسجيل دخول.`;
    return (
      <div className="card max-w-xl space-y-4 p-5">
        <h2 className="text-lg font-semibold">✓ أُنشئ المتجر</h2>
        <p className="text-[13px] text-muted">أرسل هذه المعلومات إلى التاجر. لن تظهر كلمة المرور مرة أخرى (يمكنك إنشاء كلمة جديدة من صفحة المتجر).</p>
        <pre className="whitespace-pre-wrap rounded-lg bg-[#f7f7f7] p-3 text-[13px] leading-6">{msg}</pre>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn" onClick={() => navigator.clipboard.writeText(msg).catch(() => {})}>
            نسخ الرسالة
          </button>
          <a href={`https://wa.me/?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener noreferrer" className="btn !bg-[#25D366]">
            إرسالها عبر واتساب
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
                  اختر
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
            <Field label="واتساب الطلبات" hint="مثال: 0912345678">
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
            <Field label="البريد الإلكتروني لتسجيل الدخول">
              <input name="email" type="email" required dir="ltr" className="input" />
            </Field>
            <Field label="كلمة المرور" hint="اتركه فارغاً لإنشاء كلمة مرور تلقائياً">
              <input name="password" dir="ltr" className="input" autoComplete="new-password" />
            </Field>
          </div>
          <Field label="ملاحظات خاصة بك" hint="لا يراها التاجر">
            <textarea name="note" rows={2} className="input" />
          </Field>
        </section>
      </div>
      <div className="space-y-4">
        <section className="card space-y-3 p-4">
          <h2 className="text-sm font-semibold">الاشتراك</h2>
          <select name="plan" value={plan} onChange={(e) => setPlan(e.target.value)} className="input">
            <option value="trial">تجريبي (14 يوماً)</option>
            <option value="basic">أساسي</option>
            <option value="pro">احترافي</option>
          </select>
          {plan !== "trial" && (
            <Field label="عدد الأشهر المدفوعة" hint="القيمة 0 تعني دون تاريخ انتهاء">
              <input name="months" type="number" min={0} max={36} defaultValue={1} className="input" />
            </Field>
          )}
        </section>
        {salesmen.length > 0 && (
          <section className="card space-y-3 p-4">
            <h2 className="text-sm font-semibold">المندوب</h2>
            <select name="salesman_id" defaultValue="" className="input">
              <option value="">دون مندوب</option>
              {salesmen.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.code})
                </option>
              ))}
            </select>
          </section>
        )}
      </div>

      <SaveRow state={state?.error ? { error: state.error } : undefined} pendingText="جارٍ الإنشاء...">
        إنشاء المتجر والحساب
      </SaveRow>
    </form>
  );
}
