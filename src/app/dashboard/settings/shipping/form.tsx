"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Field, FormMessage, SubmitButton } from "@/components/form-ui";
import type { ShippingSettings } from "@/lib/types";
import { saveShipping } from "./actions";

const CITIES = [
  "دمشق",
  "ريف دمشق",
  "حلب",
  "حمص",
  "حماة",
  "اللاذقية",
  "طرطوس",
  "إدلب",
  "درعا",
  "السويداء",
  "القنيطرة",
  "دير الزور",
  "الرقة",
  "الحسكة",
];

export function ShippingForm({
  initial,
  currency,
  pro,
}: {
  initial: ShippingSettings;
  currency: string;
  pro: boolean;
}) {
  const [state, action] = useActionState(saveShipping, undefined);
  const [delivery, setDelivery] = useState(Boolean(initial.delivery));
  const [rates, setRates] = useState<{ city: string; fee: string }[]>(
    (initial.rates ?? []).map((r) => ({ city: r.city, fee: String(r.fee) })),
  );
  const unit = currency === "SYP" ? "ل.س" : "$";
  const missing = CITIES.filter((c) => !rates.some((r) => r.city === c));

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="rates" value={JSON.stringify(rates)} />
      <section className="card space-y-3 p-4">
        <h2 className="text-sm font-semibold">🏪 الاستلام من المحل</h2>
        <p className="text-[13px] text-muted">
          متاح دائماً. يطلب الزبون عبر الإنترنت ويستلم طلبه من محلك.
        </p>
        <Field
          label="مكان ووقت الاستلام"
          hint="يظهر للزبون في السلة وفي رسالة واتساب. مثلاً: حمص، شارع الحضارة بجانب صيدلية الشفاء، من 10 صباحاً حتى 9 مساءً"
        >
          <input
            name="pickup_note"
            maxLength={200}
            defaultValue={initial.pickup_note ?? ""}
            className="input"
          />
        </Field>
      </section>

      <p className="text-[13px] text-muted">
        لديك أكثر من محل؟ أضف فروعك من{" "}
        <Link href="/dashboard/settings/branches" className="font-semibold text-[#005bd3] hover:underline">
          الإعدادات، ثم الفروع
        </Link>
        .
      </p>

      <section className="card p-4">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            name="delivery"
            checked={delivery}
            onChange={(e) => setDelivery(e.target.checked)}
            className="mt-1 h-4 w-4 accent-black"
          />
          <span>
            <span className="block text-sm font-semibold">🚚 لدي خدمة توصيل</span>
            <span className="block text-[13px] text-muted">
              عند تفعيله، يختار الزبون في السلة بين الاستلام من المحل والتوصيل
              إليه.
            </span>
          </span>
        </label>
      </section>

      <div className={delivery ? "space-y-4" : "hidden"}>
        <section className="card p-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              name="gift"
              defaultChecked={Boolean(initial.gift)}
              className="mt-1 h-4 w-4 accent-black"
            />
            <span>
              <span className="block text-sm font-semibold">
                🎁 إرسال الطلب هديةً
              </span>
              <span className="block text-[13px] text-muted">
                يمكن للزبون اختيار &quot;إرسال الطلب هدية&quot; عند طلب التوصيل: فيكتب
                اسم المستلم ورقمه، ورسالة البطاقة، ويحدد إن كان يريد إخفاء
                الأسعار.
              </span>
            </span>
          </label>
        </section>
        <section className="card space-y-3 p-4">
          <h2 className="text-sm font-semibold">سعر التوصيل حسب المدينة</h2>
          <p className="text-[13px] text-muted">
            يختار الزبون مدينته في السلة، ويظهر سعر التوصيل تلقائياً. وتُطبَّق على المدن
            غير المدرجة في القائمة الرسوم العامة أدناه.
          </p>
          {rates.length > 0 && (
            <ul className="divide-y divide-black/5 rounded-lg border border-black/10">
              {rates.map((r, i) => (
                <li key={i} className="flex items-center gap-2 p-2">
                  <input
                    className="input flex-1"
                    value={r.city}
                    onChange={(e) =>
                      setRates(
                        rates.map((x, j) =>
                          j === i ? { ...x, city: e.target.value } : x,
                        ),
                      )
                    }
                  />
                  <input
                    className="input !w-28"
                    dir="ltr"
                    inputMode="decimal"
                    placeholder={unit}
                    value={r.fee}
                    onChange={(e) =>
                      setRates(
                        rates.map((x, j) =>
                          j === i ? { ...x, fee: e.target.value } : x,
                        ),
                      )
                    }
                  />
                  <span className="text-xs text-muted">{unit}</span>
                  <button
                    type="button"
                    className="px-2 text-muted hover:text-red-700"
                    onClick={() => setRates(rates.filter((_, j) => j !== i))}
                    aria-label="حذف"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap gap-1.5">
            {missing.map((c) => (
              <button
                key={c}
                type="button"
                className="rounded-lg border border-black/10 px-2.5 py-1 text-[13px] hover:bg-[#f7f7f7]"
                onClick={() => setRates([...rates, { city: c, fee: "" }])}
              >
                + {c}
              </button>
            ))}
            <button
              type="button"
              className="rounded-lg border border-dashed border-black/20 px-2.5 py-1 text-[13px]"
              onClick={() => setRates([...rates, { city: "", fee: "" }])}
            >
              + مدينة أو منطقة أخرى
            </button>
          </div>
          <p className="text-xs text-muted">
            أدخل 0 للمدن التي يكون التوصيل إليها مجانياً.
          </p>
        </section>

        <section className="card grid gap-3 p-4 sm:grid-cols-2">
          <Field
            label={`السعر العام للتوصيل (${unit})`}
            hint="للمدن غير المدرجة في القائمة. اتركه فارغاً إذا كان مجانياً"
          >
            <input
              name="default_fee"
              inputMode="decimal"
              defaultValue={initial.default_fee ?? ""}
              className="input"
              dir="ltr"
            />
          </Field>
          <Field
            label={`توصيل مجاني للطلبات التي تتجاوز (${unit})`}
            hint="اختياري، مثلاً: 50"
          >
            <input
              name="free_over"
              inputMode="decimal"
              defaultValue={initial.free_over ?? ""}
              className="input"
              dir="ltr"
            />
          </Field>
        </section>
      </div>

      <FormMessage state={state} />
      <SubmitButton>حفظ</SubmitButton>
    </form>
  );
}
