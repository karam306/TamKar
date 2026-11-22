"use client";

import { useActionState, useEffect, useState } from "react";
import { Field, FormMessage, SubmitButton } from "@/components/form-ui";
import { formatPrice } from "@/lib/format";
import type { Currency, Product } from "@/lib/types";
import { createManualOrder } from "../actions";
import { findCustomer, searchProducts } from "./search";

type Line = {
  productId: string;
  variantId?: string;
  title: string;
  variantTitle?: string;
  price: number;
  qty: number;
  image?: string;
};
type C = {
  name: string;
  phone: string;
  city?: string | null;
  address?: string | null;
};

export function ManualOrderForm({
  currency,
  defaultCity,
  customer,
  delivery,
}: {
  currency: Currency;
  defaultCity: string;
  customer?: C;
  delivery: boolean;
}) {
  const [method, setMethod] = useState<"pickup" | "delivery">("pickup");
  const [state, action] = useActionState(createManualOrder, undefined);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [c, setC] = useState<C>(
    customer ?? { name: "", phone: "", city: defaultCity, address: "" },
  );
  const [found, setFound] = useState(false);

  useEffect(() => {
    let alive = true;
    const t = setTimeout(
      () => searchProducts(q).then((r) => alive && setResults(r)),
      250,
    );
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q]);

  const add = (p: Product, v?: NonNullable<Product["variants"]>[number]) =>
    setLines((cur) => {
      const key = `${p.id}|${v?.id ?? ""}`;
      if (cur.some((l) => `${l.productId}|${l.variantId ?? ""}` === key))
        return cur.map((l) =>
          `${l.productId}|${l.variantId ?? ""}` === key
            ? { ...l, qty: l.qty + 1 }
            : l,
        );
      return [
        ...cur,
        {
          productId: p.id,
          variantId: v?.id,
          title: p.title,
          variantTitle: v?.title,
          price: Number(v?.price ?? p.price),
          qty: 1,
          image: p.images?.[0],
        },
      ];
    });
  const total = lines.reduce((s, l) => s + l.price * l.qty, 0);

  return (
    <form
      action={action}
      className="grid items-start gap-4 lg:grid-cols-[1fr_300px]"
    >
      <input
        type="hidden"
        name="items"
        value={JSON.stringify(
          lines.map((l) => ({
            productId: l.productId,
            variantId: l.variantId,
            qty: l.qty,
          })),
        )}
      />
      <div className="space-y-4">
        <section className="card space-y-3 p-4">
          <h2 className="text-sm font-semibold">المنتجات</h2>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث عن منتج بالاسم أو SKU"
            className="input"
          />
          <ul className="max-h-64 divide-y divide-black/5 overflow-y-auto rounded-lg border border-black/10">
            {results.map((p) =>
              (p.variants?.length ?? 0) > 0 ? (
                p.variants!.map((v) => (
                  <li key={v.id}>
                    <button
                      type="button"
                      disabled={v.stock === 0}
                      onClick={() => add(p, v)}
                      className="flex w-full items-center justify-between gap-2 p-2 text-right text-[13px] hover:bg-[#f7f7f7] disabled:opacity-40"
                    >
                      <span>
                        {p.title}{" "}
                        <span className="text-muted">· {v.title}</span>
                      </span>
                      <span className="whitespace-nowrap">
                        {formatPrice(Number(v.price), currency)}
                        {v.stock != null && (
                          <span className="text-muted"> ({v.stock})</span>
                        )}
                      </span>
                    </button>
                  </li>
                ))
              ) : (
                <li key={p.id}>
                  <button
                    type="button"
                    disabled={p.stock === 0}
                    onClick={() => add(p)}
                    className="flex w-full items-center justify-between gap-2 p-2 text-right text-[13px] hover:bg-[#f7f7f7] disabled:opacity-40"
                  >
                    <span>{p.title}</span>
                    <span className="whitespace-nowrap">
                      {formatPrice(p.price, currency)}
                      {p.stock != null && (
                        <span className="text-muted"> ({p.stock})</span>
                      )}
                    </span>
                  </button>
                </li>
              ),
            )}
            {results.length === 0 && (
              <li className="p-3 text-center text-[13px] text-muted">
                لا توجد نتائج
              </li>
            )}
          </ul>

          {lines.length > 0 && (
            <ul className="divide-y divide-black/5 border-t border-black/5">
              {lines.map((l, i) => (
                <li
                  key={`${l.productId}|${l.variantId}`}
                  className="flex items-center gap-3 py-2 text-[13px]"
                >
                  <div className="flex-1">
                    <div className="font-semibold">{l.title}</div>
                    {l.variantTitle && (
                      <div className="text-xs text-muted">{l.variantTitle}</div>
                    )}
                  </div>
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={l.qty}
                    onChange={(e) =>
                      setLines((cur) =>
                        cur.map((x, j) =>
                          j === i
                            ? {
                                ...x,
                                qty: Math.max(1, Number(e.target.value) || 1),
                              }
                            : x,
                        ),
                      )
                    }
                    className="input !w-16 !py-1"
                  />
                  <span className="w-20 text-left">
                    {formatPrice(l.price * l.qty, currency)}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setLines((cur) => cur.filter((_, j) => j !== i))
                    }
                    className="text-muted hover:text-red-700"
                    aria-label="حذف"
                  >
                    ✕
                  </button>
                </li>
              ))}
              <li className="flex justify-between pt-2 font-semibold">
                <span>المجموع</span>
                <span>{formatPrice(total, currency)}</span>
              </li>
            </ul>
          )}
        </section>
      </div>

      <div className="space-y-4">
        <section className="card space-y-3 p-4">
          <h2 className="text-sm font-semibold">الزبون</h2>
          <Field
            label="الهاتف"
            hint={
              found
                ? "✓ زبون مسجّل، وتمت تعبئة بياناته"
                : "إذا سبق للزبون الطلب، تُعبَّأ بياناته تلقائياً"
            }
          >
            <input
              name="phone"
              required
              dir="ltr"
              inputMode="tel"
              className="input"
              value={c.phone}
              onChange={(e) => setC({ ...c, phone: e.target.value })}
              onBlur={async () => {
                const r = await findCustomer(c.phone);
                setFound(Boolean(r));
                if (r)
                  setC({
                    ...c,
                    name: c.name || r.name,
                    city: c.city || r.city,
                    address: c.address || r.address,
                  });
              }}
            />
          </Field>
          <Field label="الاسم">
            <input
              name="name"
              required
              className="input"
              value={c.name}
              onChange={(e) => setC({ ...c, name: e.target.value })}
            />
          </Field>
          <input type="hidden" name="method" value={method} />
          {delivery && (
            <Field label="طريقة الاستلام">
              <div className="grid grid-cols-2 gap-2">
                {(["pickup", "delivery"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    className={`rounded-lg border p-2 text-[13px] ${method === m ? "border-black bg-[#f7f7f7] font-semibold" : "border-black/15"}`}
                  >
                    {m === "pickup" ? "🏪 من المحل" : "🚚 توصيل"}
                  </button>
                ))}
              </div>
            </Field>
          )}
          {method === "delivery" && (
            <>
              <Field label="المدينة">
                <input
                  name="city"
                  required
                  className="input"
                  value={c.city ?? ""}
                  onChange={(e) => setC({ ...c, city: e.target.value })}
                />
              </Field>
              <Field label="العنوان">
                <textarea
                  name="address"
                  required
                  rows={2}
                  className="input"
                  value={c.address ?? ""}
                  onChange={(e) => setC({ ...c, address: e.target.value })}
                />
              </Field>
            </>
          )}
          <Field label="ملاحظات">
            <textarea name="notes" rows={2} className="input" />
          </Field>
          <Field label="رمز خصم (اختياري)">
            <input name="discount_code" className="input" dir="ltr" />
          </Field>
          <label className="flex items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              name="paid"
              className="h-4 w-4 accent-black"
            />
            دفع الزبون مسبقاً
          </label>
        </section>
        <FormMessage state={state} />
        <SubmitButton className="w-full" pendingText="جارٍ الإنشاء...">
          إنشاء الطلب
        </SubmitButton>
      </div>
    </form>
  );
}
