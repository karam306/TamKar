"use client";

import { useActionState } from "react";
import { Field, SubmitButton } from "@/components/form-ui";
import { storeUrl } from "@/lib/urls";
import { createTestStores, removeTestStores, setTestPasswords } from "./actions";

export function SeedForms({ existing }: { existing: string[] }) {
  const [state, create] = useActionState(createTestStores, undefined);
  const [del, remove] = useActionState(removeTestStores, undefined);
  const [pw, setPw] = useActionState(setTestPasswords, undefined);
  return (
    <>
      <section className="card space-y-3 p-4">
        <h2 className="text-sm font-semibold">إنشاء 3 متاجر كاملة للتجربة</h2>
        <p className="text-[13px] text-muted">
          بيت المطبخ (أدوات منزلية، اشتراك مدفوع)، ولمار (ألبسة بمقاسات وألوان، فترة تجربة)، وحلويات الياسمين (أطعمة بالليرة السورية، اشتراك قارب على الانتهاء). يحتوي كل متجر على منتجات
          بمخزون، ومجموعات، وزبائن، وطلبات بجميع الحالات، ورموز خصم، وصفحات، وزيارات للتحليلات.
        </p>
        {existing.length > 0 && <p className="rounded-lg bg-[#fff4d6] p-2 text-[13px]">توجد متاجر تجريبية: {existing.join("، ")}. احذفها أولاً إذا أردت إعادة إنشائها.</p>}
        <form action={create} className="space-y-3">
          <Field label="رقم واتساب لاستقبال الطلبات التجريبية" hint="رقمك، مثلاً: 971501234567 أو 0933123456">
            <input name="whatsapp" className="input !w-64" dir="ltr" required />
          </Field>
          {state?.error && <p className="text-[13px] text-[#8e1f0b]">{state.error}</p>}
          <SubmitButton>إنشاء المتاجر (يستغرق نحو دقيقة)</SubmitButton>
        </form>
        {state?.results && (
          <div className="space-y-2">
            <p className="rounded-lg bg-[#fff4d6] p-2 text-[13px] font-semibold">⚠️ انسخ كلمات المرور الآن، فلن تُعرض مرة أخرى (يمكنك تغييرها من صفحة المتجر)</p>
            {state.results.map((r) => (
              <div key={r.slug} className="rounded-lg border border-black/10 p-3 text-[13px]">
                <div className="font-semibold">{r.name}</div>
                {r.error ? (
                  <div className="text-[#8e1f0b]">{r.error}</div>
                ) : (
                  <div className="mt-1 space-y-0.5" dir="ltr" style={{ textAlign: "right" }}>
                    <div>
                      Email: <b>{r.email}</b>
                    </div>
                    <div>
                      Password: <b>{r.password}</b>
                    </div>
                    <div>
                      <a className="text-[#005bd3] underline" href={storeUrl(r.slug)} target="_blank">
                        {storeUrl(r.slug)}
                      </a>{" "}
                      · {r.orders} orders
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
      <section className="card space-y-3 p-4">
        <h2 className="text-sm font-semibold">كلمة مرور موحّدة للمتاجر التجريبية</h2>
        <p className="text-[13px] text-muted">يغيّر كلمة مرور المتاجر الثلاثة إلى كلمة واحدة تختارها، ويعرض عناوين البريد الإلكتروني.</p>
        <form action={setPw} className="flex flex-wrap gap-2">
          <input name="password" dir="ltr" minLength={8} required placeholder="8 أحرف على الأقل" className="input !w-56" autoComplete="new-password" />
          <SubmitButton>تغيير</SubmitButton>
        </form>
        {pw?.error && <p className="text-[13px] text-[#8e1f0b]">{pw.error}</p>}
        {pw?.results?.map((r) => (
          <div key={r.slug} className="rounded-lg border border-black/10 p-3 text-[13px]" dir="ltr" style={{ textAlign: "right" }}>
            <b>{r.name}</b> · {r.email} · {r.error ?? "✓"}
          </div>
        ))}
      </section>
      <section className="card space-y-2 p-4">
        <h2 className="text-sm font-semibold">حذف المتاجر التجريبية</h2>
        <p className="text-[13px] text-muted">يحذف المتاجر الثلاثة وحساباتها وكل محتوياتها، ولا تتأثر المتاجر الحقيقية.</p>
        <form action={remove}>
          <SubmitButton>حذف</SubmitButton>
        </form>
        {del?.ok && <p className="text-[13px]">{del.ok}</p>}
      </section>
    </>
  );
}
