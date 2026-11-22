"use client";

import { useActionState, useEffect, useState } from "react";
import { Field, FormMessage, SubmitButton } from "@/components/form-ui";
import { formatPrice } from "@/lib/format";
import type { Currency, Product, QuoteLine } from "@/lib/types";
import { findCustomer, searchProducts } from "../../orders/new/search";
import { createQuote } from "../actions";

type Line = QuoteLine & { key: string; price: number };

export function QuoteForm({ currency }: { currency: Currency }) {
  const [state, action] = useActionState(createQuote, undefined);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [discount, setDiscount] = useState("");
  const [delivery, setDelivery] = useState("");

  useEffect(() => {
    let alive = true;
    const t = setTimeout(() => searchProducts(q).then((r) => alive && setResults(r)), 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q]);

  const add = (p: Product, v?: NonNullable<Product["variants"]>[number]) =>
    setLines((cur) => [
      ...cur,
      { key: `${p.id}|${v?.id ?? ""}|${cur.length}`, productId: p.id, title: p.title, variantTitle: v?.title ?? null, price: Number(v?.price ?? p.price), qty: 1 },
    ]);
  const update = (i: number, patch: Partial<Line>) => setLines(lines.map((l, k) => (k === i ? { ...l, ...patch } : l)));
  const subtotal = lines.reduce((s, l) => s + (Number(l.price) || 0) * (Number(l.qty) || 0), 0);
  const total = subtotal - (Number(discount) || 0) + (Number(delivery) || 0);

  return (
    <form action={action} className="grid items-start gap-4 lg:grid-cols-[1fr_300px]">
      <input type="hidden" name="items" value={JSON.stringify(lines.map(({ key, ...l }) => (void key, l)))} />
      <section className="card space-y-3 p-4">
        <h2 className="text-sm font-semibold">المنتجات</h2>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن منتج بالاسم أو SKU" className="input" />
        <ul className="max-h-56 divide-y divide-black/5 overflow-y-auto rounded-lg border border-black/10">
          {results.flatMap((p) =>
            (p.variants?.length ?? 0) > 0
              ? p.variants!.map((v) => (
                  <li key={v.id}>
                    <button type="button" onClick={() => add(p, v)} className="flex w-full justify-between gap-2 p-2 text-right text-[13px] hover:bg-[#f7f7f7]">
                      <span>
                        {p.title} <span className="text-muted">· {v.title}</span>
                      </span>
                      <span>{formatPrice(Number(v.price), currency)}</span>
                    </button>
                  </li>
                ))
              : [
                  <li key={p.id}>
                    <button type="button" onClick={() => add(p)} className="flex w-full justify-between gap-2 p-2 text-right text-[13px] hover:bg-[#f7f7f7]">
                      <span>{p.title}</span>
                      <span>{formatPrice(p.price, currency)}</span>
                    </button>
                  </li>,
                ],
          )}
        </ul>
        <button
          type="button"
          className="text-[13px] font-semibold text-[#005bd3] hover:underline"
          onClick={() => setLines([...lines, { key: `custom${lines.length}`, title: "", price: 0, qty: 1 }])}
        >
          + بند غير موجود في المنتجات (خدمة، تركيب، منتج خاص...)
        </button>

        {lines.length > 0 && (
          <ul className="divide-y divide-black/5 border-t border-black/5">
            {lines.map((l, i) => (
              <li key={l.key} className="grid grid-cols-[1fr_70px_100px_24px] items-center gap-2 py-2 text-[13px]">
                <div>
                  {l.productId ? (
                    <>
                      <div className="font-semibold">{l.title}</div>
                      {l.variantTitle && <div className="text-xs text-muted">{l.variantTitle}</div>}
                    </>
                  ) : (
                    <input className="input" placeholder="اسم البند" value={l.title} onChange={(e) => update(i, { title: e.target.value })} />
                  )}
                </div>
                <input type="number" min={1} className="input" value={l.qty} onChange={(e) => update(i, { qty: Number(e.target.value) })} aria-label="الكمية" />
                <input inputMode="decimal" dir="ltr" className="input" value={l.price} onChange={(e) => update(i, { price: Number(e.target.value.replace(/[^\d.]/g, "")) })} aria-label="السعر" />
                <button type="button" className="text-muted hover:text-red-700" onClick={() => setLines(lines.filter((_, k) => k !== i))} aria-label="حذف">
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted">يمكنك تغيير سعر أي منتج في العرض (سعر جملة أو سعر خاص) دون أن يتغيّر سعره في المتجر.</p>
      </section>

      <div className="space-y-4">
        <section className="card space-y-3 p-4">
          <h2 className="text-sm font-semibold">الزبون</h2>
          <Field label="الهاتف">
            <input
              name="phone"
              dir="ltr"
              inputMode="tel"
              className="input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={async () => {
                const r = await findCustomer(phone);
                if (r && !name) setName(r.name);
              }}
            />
          </Field>
          <Field label="الاسم">
            <input name="customer_name" required className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
        </section>
        <section className="card space-y-3 p-4">
          <Field label="خصم (مبلغ)">
            <input name="discount" inputMode="decimal" dir="ltr" className="input" value={discount} onChange={(e) => setDiscount(e.target.value)} />
          </Field>
          <Field label="رسوم التوصيل (اختياري)">
            <input name="delivery_fee" inputMode="decimal" dir="ltr" className="input" value={delivery} onChange={(e) => setDelivery(e.target.value)} />
          </Field>
          <Field label="العرض صالح لمدة">
            <select name="valid_days" defaultValue="7" className="input">
              <option value="3">3 أيام</option>
              <option value="7">أسبوع</option>
              <option value="14">أسبوعين</option>
              <option value="30">شهر</option>
            </select>
          </Field>
          <Field label="ملاحظات للزبون">
            <textarea name="notes" rows={3} className="input" placeholder="مثلاً: السعر يشمل التركيب" />
          </Field>
          <div className="flex justify-between border-t border-black/10 pt-3 text-sm font-semibold">
            <span>المجموع</span>
            <span>{formatPrice(Math.max(0, total), currency)}</span>
          </div>
          <FormMessage state={state} />
          <SubmitButton>حفظ العرض</SubmitButton>
        </section>
      </div>
    </form>
  );
}
