"use client";

import { useActionState, useState } from "react";
import { Field, FormMessage, SubmitButton } from "@/components/form-ui";
import type { Branch, ShippingSettings } from "@/lib/types";
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
  const [branches, setBranches] = useState<Branch[]>(initial.branches ?? []);
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
      <input type="hidden" name="branches" value={JSON.stringify(branches)} />
      <section className="card space-y-3 p-4">
        <h2 className="text-sm font-semibold">🏪 الاستلام من المحل</h2>
        <p className="text-[13px] text-muted">
          دايماً شغال. الزبون بيطلب أونلاين وبيجي ياخد طلبه من محلك.
        </p>
        <Field
          label="مكان ووقت الاستلام"
          hint="بيظهر للزبون بالسلة وبرسالة الواتساب. مثلاً: حمص، شارع الحضارة جانب صيدلية الشفاء، من 10 الصبح لـ 9 المسا"
        >
          <input
            name="pickup_note"
            maxLength={200}
            defaultValue={initial.pickup_note ?? ""}
            className="input"
          />
        </Field>
      </section>

      <section className="card space-y-3 p-4">
        <h2 className="text-sm font-semibold">🏬 الفروع {!pro && "🔒"}</h2>
        {!pro ? (
          <p className="rounded-lg bg-[#f4f0ff] p-3 text-[13px]">
            عندك أكتر من محل؟ بالباقة الاحترافية بتضيف لغاية 5 فروع، والزبون
            بيختار من وين يستلم، والطلب بيوصل لواتساب الفرع نفسه.
          </p>
        ) : (
          <>
            <p className="text-[13px] text-muted">
              الزبون بيختار من أي فرع بيستلم، والطلب بيروح لواتساب هالفرع. المحل
              الرئيسي (فوق) بيضل أول خيار.
            </p>
            {branches.map((b, i) => (
              <div
                key={b.id || i}
                className="grid gap-2 rounded-lg border border-black/10 p-3 sm:grid-cols-3"
              >
                <input
                  className="input"
                  placeholder="اسم الفرع"
                  value={b.name}
                  onChange={(e) =>
                    setBranches(
                      branches.map((x, k) =>
                        k === i ? { ...x, name: e.target.value } : x,
                      ),
                    )
                  }
                />
                <input
                  className="input"
                  placeholder="العنوان والأوقات"
                  value={b.note ?? ""}
                  onChange={(e) =>
                    setBranches(
                      branches.map((x, k) =>
                        k === i ? { ...x, note: e.target.value } : x,
                      ),
                    )
                  }
                />
                <div className="flex gap-2">
                  <input
                    className="input"
                    dir="ltr"
                    placeholder="واتساب الفرع"
                    value={b.whatsapp}
                    onChange={(e) =>
                      setBranches(
                        branches.map((x, k) =>
                          k === i ? { ...x, whatsapp: e.target.value } : x,
                        ),
                      )
                    }
                  />
                  <button
                    type="button"
                    className="px-2 text-muted hover:text-red-700"
                    onClick={() =>
                      setBranches(branches.filter((_, k) => k !== i))
                    }
                    aria-label="احذف"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
            {branches.length < 4 && (
              <button
                type="button"
                className="text-[13px] font-semibold text-[#005bd3] hover:underline"
                onClick={() =>
                  setBranches([
                    ...branches,
                    { id: "", name: "", note: "", whatsapp: "" },
                  ])
                }
              >
                + ضيف فرع
              </button>
            )}
          </>
        )}
      </section>

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
            <span className="block text-sm font-semibold">🚚 عندي توصيل</span>
            <span className="block text-[13px] text-muted">
              إذا فعّلته، الزبون بيختار بالسلة بين الاستلام من المحل أو التوصيل
              لعنده.
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
                🎁 إرسال الطلب كهدية
              </span>
              <span className="block text-[13px] text-muted">
                الزبون بيقدر يختار &quot;ابعته كهدية&quot; لما يطلب توصيل: بيكتب
                اسم ورقم الشخص اللي رح يستلم، ورسالة للكرت، وإذا بدو تخفوا
                الأسعار.
              </span>
            </span>
          </label>
        </section>
        <section className="card space-y-3 p-4">
          <h2 className="text-sm font-semibold">سعر التوصيل حسب المدينة</h2>
          <p className="text-[13px] text-muted">
            الزبون بيختار مدينته بالسلة، وبيظهر سعر التوصيل تلقائياً. المدن اللي
            مش بالقائمة بياخدوا السعر العام تحت.
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
                    aria-label="احذف"
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
              + مدينة أو منطقة تانية
            </button>
          </div>
          <p className="text-xs text-muted">
            حط 0 للمدن اللي التوصيل فيها مجاني.
          </p>
        </section>

        <section className="card grid gap-3 p-4 sm:grid-cols-2">
          <Field
            label={`السعر العام للتوصيل (${unit})`}
            hint="للمدن اللي مش بالقائمة. اتركه فاضي إذا مجاني"
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
            label={`توصيل مجاني للطلبات فوق (${unit})`}
            hint="اختياري، مثلاً 50"
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
      <SubmitButton>احفظ</SubmitButton>
    </form>
  );
}
