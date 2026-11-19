"use client";

import { useActionState } from "react";
import { Field, SubmitButton } from "@/components/form-ui";
import { storeUrl } from "@/lib/urls";
import { createTestStores, removeTestStores } from "./actions";

export function SeedForms({ existing }: { existing: string[] }) {
  const [state, create] = useActionState(createTestStores, undefined);
  const [del, remove] = useActionState(removeTestStores, undefined);
  return (
    <>
      <section className="card space-y-3 p-4">
        <h2 className="text-sm font-semibold">أنشئ 3 متاجر كاملة للتجربة</h2>
        <p className="text-[13px] text-muted">
          بيت المطبخ (أدوات منزلية، اشتراك مدفوع)، لمار (ألبسة بمقاسات وألوان، فترة تجربة)، وحلويات الياسمين (أكل بالليرة السورية، اشتراكه قرب يخلص). كل متجر فيه منتجات
          بمخزون، مجموعات، زباين، طلبات بكل الحالات، أكواد خصم، صفحات، وزيارات للتحليلات.
        </p>
        {existing.length > 0 && <p className="rounded-lg bg-[#fff4d6] p-2 text-[13px]">في متاجر تجريبية موجودة: {existing.join("، ")}. احذفها أول إذا بدك تعيد إنشاءها.</p>}
        <form action={create} className="space-y-3">
          <Field label="رقم واتساب لاستقبال الطلبات التجريبية" hint="رقمك، مثلاً 971501234567 أو 0933123456">
            <input name="whatsapp" className="input !w-64" dir="ltr" required />
          </Field>
          {state?.error && <p className="text-[13px] text-[#8e1f0b]">{state.error}</p>}
          <SubmitButton>أنشئ المتاجر (بياخد دقيقة تقريباً)</SubmitButton>
        </form>
        {state?.results && (
          <div className="space-y-2">
            <p className="rounded-lg bg-[#fff4d6] p-2 text-[13px] font-semibold">⚠️ انسخ كلمات السر هلق، ما رح تنعرض مرة تانية (فيك تغيرها من صفحة المتجر)</p>
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
      <section className="card space-y-2 p-4">
        <h2 className="text-sm font-semibold">احذف المتاجر التجريبية</h2>
        <p className="text-[13px] text-muted">بيحذف المتاجر الثلاثة وحساباتها وكل شي فيها. المتاجر الحقيقية ما بتنمس.</p>
        <form action={remove}>
          <SubmitButton>احذف</SubmitButton>
        </form>
        {del?.ok && <p className="text-[13px]">{del.ok}</p>}
      </section>
    </>
  );
}
