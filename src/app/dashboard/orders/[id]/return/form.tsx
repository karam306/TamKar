"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { FormMessage, SubmitButton } from "@/components/form-ui";
import { formatPrice } from "@/lib/format";
import type { Currency, Product } from "@/lib/types";
import { processReturn } from "../../actions";
import { searchProducts } from "../../new/search";

type Line = { productId: string; variantId?: string; title: string; variantTitle?: string; price: number; image?: string; remaining: number; ordered: number };
type NewLine = { productId: string; variantId?: string; title: string; variantTitle?: string; price: number; qty: number; stock: number | null };

export function ReturnForm({
  orderId,
  currency,
  lines,
  maxRefund,
  hadDiscount,
  methods,
  defaultMethod,
}: {
  orderId: string;
  currency: Currency;
  lines: Line[];
  maxRefund: number;
  hadDiscount: boolean;
  methods: string[];
  defaultMethod: string;
}) {
  const [state, action] = useActionState(processReturn, undefined);
  const [kind, setKind] = useState<"refund" | "exchange">("refund");
  const [qty, setQty] = useState<number[]>(lines.map(() => 0));
  const [restock, setRestock] = useState(true);
  const [newLines, setNewLines] = useState<NewLine[]>([]);
  const [method, setMethod] = useState(defaultMethod);
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState<string | null>(null); // null: follow the suggestion
  const money = (n: number) => formatPrice(n, currency);

  const back = lines.reduce((t, l, i) => t + l.price * qty[i], 0);
  const out = newLines.reduce((t, l) => t + l.price * l.qty, 0);
  const diff = kind === "exchange" ? out - back : -back; // > 0: customer pays more; < 0: we give money back
  const suggested = Math.min(maxRefund, Math.max(0, -diff));
  const extra = kind === "exchange" && diff > 0 ? diff : 0;
  const refund = amount === null ? suggested : Math.max(0, Number(amount.replace(/,/g, "")) || 0);
  const nothingLeft = lines.every((l) => l.remaining === 0);

  const payload = JSON.stringify({
    kind,
    items: lines.map((l, i) => ({ productId: l.productId, variantId: l.variantId, qty: qty[i] })).filter((x) => x.qty > 0),
    newItems: newLines.map((l) => ({ productId: l.productId, variantId: l.variantId, qty: l.qty })),
    restock,
    refund: extra > 0 ? 0 : refund,
    extra: extra > 0 ? (amount === null ? extra : Math.max(0, Number(amount.replace(/,/g, "")) || 0)) : 0,
    method,
    reason,
  });

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={orderId} />
      <input type="hidden" name="payload" value={payload} />

      <section className="card grid grid-cols-2 gap-2 p-2">
        {(
          [
            ["refund", "↩ استرجاع", "الزبون رجّع قطع، وبترجعله مصاريه"],
            ["exchange", "🔄 تبديل", "الزبون رجّع قطع وأخد غيرها (مقاس تاني، لون، منتج تاني)"],
          ] as const
        ).map(([k, label, hint]) => (
          <button
            key={k}
            type="button"
            onClick={() => {
              setKind(k);
              setAmount(null);
            }}
            className={`rounded-lg p-3 text-right text-[13px] ${kind === k ? "bg-[#303030] text-white" : "hover:bg-[#f7f7f7]"}`}
          >
            <b className="block text-sm">{label}</b>
            <span className={kind === k ? "text-white/75" : "text-muted"}>{hint}</span>
          </button>
        ))}
      </section>

      <section className="card space-y-3 p-4">
        <h2 className="text-sm font-semibold">شو رجّع الزبون؟</h2>
        {nothingLeft && <p className="text-[13px] text-muted">كل قطع هالطلب رجعت من قبل.</p>}
        <ul className="divide-y divide-black/5">
          {lines.map((l, i) => (
            <li key={`${l.productId}|${l.variantId ?? ""}`} className="flex items-center gap-3 py-2.5 text-[13px]">
              {l.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={l.image} alt="" className="h-10 w-10 rounded-lg border border-black/5 object-cover" />
              ) : (
                <span className="h-10 w-10 rounded-lg bg-[#e3e3e3]" />
              )}
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{l.title}</div>
                <div className="text-xs text-muted">
                  {l.variantTitle ? `${l.variantTitle} · ` : ""}
                  {money(l.price)} · انطلب {l.ordered}
                  {l.remaining < l.ordered ? ` · رجع منهم ${l.ordered - l.remaining}` : ""}
                </div>
              </div>
              <Stepper value={qty[i]} max={l.remaining} onChange={(n) => setQty(qty.map((q, j) => (j === i ? n : q)))} />
            </li>
          ))}
        </ul>
        <label className="flex items-center gap-2 text-[13px]">
          <input type="checkbox" checked={restock} onChange={(e) => setRestock(e.target.checked)} className="h-4 w-4 accent-black" />
          رجّع القطع للمخزون (شيلها إذا القطعة تالفة وما رح تنباع)
        </label>
      </section>

      {kind === "exchange" && <ExchangePicker currency={currency} lines={newLines} setLines={setNewLines} />}

      <section className="card space-y-3 p-4 text-[13px]">
        <h2 className="text-sm font-semibold">الحساب</h2>
        <Row label="قيمة القطع اللي رجعت" value={money(back)} />
        {kind === "exchange" && <Row label="قيمة القطع الجديدة" value={money(out)} />}
        {hadDiscount && back > 0 && <p className="rounded-lg bg-[#fff4d6] p-2">الطلب كان عليه خصم، يمكن لازم ترجّع أقل من السعر الكامل. عدّل المبلغ تحت إذا لزم.</p>}
        {extra > 0 ? (
          <label className="block space-y-1">
            <span className="font-semibold">الزبون بيدفع زيادة</span>
            <input value={amount ?? String(extra)} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" className="input" dir="ltr" />
          </label>
        ) : (
          <label className="block space-y-1">
            <span className="font-semibold">المبلغ اللي رجّعته للزبون</span>
            <input value={amount ?? String(suggested)} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" className="input" dir="ltr" />
            <span className="text-xs text-muted">أكتر شي فيك ترجّع {money(maxRefund)}. حط 0 إذا ما رجّعت مصاري (مثلاً بدّل بنفس السعر).</span>
          </label>
        )}
        <label className="block space-y-1">
          <span className="font-semibold">كيف رجّعت أو استلمت المبلغ؟</span>
          <select value={method} onChange={(e) => setMethod(e.target.value)} className="input">
            {methods.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="font-semibold">السبب (اختياري)</span>
          <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="مثلاً: المقاس صغير" className="input" />
        </label>
      </section>

      <FormMessage state={state} />
      <SubmitButton pendingText="جاري التسجيل...">{kind === "exchange" ? "سجّل التبديل" : "سجّل الاسترجاع"}</SubmitButton>
    </form>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

function Stepper({ value, max, onChange }: { value: number; max: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center rounded-lg border border-black/15">
      <button type="button" disabled={value <= 0} onClick={() => onChange(value - 1)} className="px-2.5 py-1 text-lg leading-none disabled:opacity-30" aria-label="نقّص">
        −
      </button>
      <span className="w-7 text-center font-semibold">{value}</span>
      <button type="button" disabled={value >= max} onClick={() => onChange(value + 1)} className="px-2.5 py-1 text-lg leading-none disabled:opacity-30" aria-label="زيد">
        +
      </button>
    </div>
  );
}

/** Pick what the customer takes instead. */
function ExchangePicker({ currency, lines, setLines }: { currency: Currency; lines: NewLine[]; setLines: (l: NewLine[]) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  useEffect(() => {
    let alive = true;
    const t = setTimeout(() => searchProducts(q).then((r) => alive && setResults(r)), 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q]);
  const money = (n: number) => formatPrice(n, currency);
  const key = (l: { productId: string; variantId?: string }) => `${l.productId}|${l.variantId ?? ""}`;
  const add = (p: Product, v?: NonNullable<Product["variants"]>[number]) => {
    const nl: NewLine = { productId: p.id, variantId: v?.id, title: p.title, variantTitle: v?.title, price: Number(v?.price ?? p.price), qty: 1, stock: v ? (v.stock ?? null) : (p.stock ?? null) };
    const found = lines.find((l) => key(l) === key(nl));
    setLines(found ? lines.map((l) => (key(l) === key(nl) ? { ...l, qty: l.qty + 1 } : l)) : [...lines, nl]);
  };
  const shown = useMemo(() => results.filter((p) => p.active !== false), [results]);

  return (
    <section className="card space-y-3 p-4">
      <h2 className="text-sm font-semibold">شو أخد بدالها؟</h2>
      {lines.length > 0 && (
        <ul className="divide-y divide-black/5 rounded-lg border border-black/10">
          {lines.map((l) => (
            <li key={key(l)} className="flex items-center gap-2 p-2 text-[13px]">
              <span className="flex-1">
                <b>{l.title}</b>
                {l.variantTitle && <span className="text-muted"> · {l.variantTitle}</span>}
                <span className="text-muted"> · {money(l.price)}</span>
              </span>
              <Stepper
                value={l.qty}
                max={l.stock ?? 999}
                onChange={(n) => setLines(n <= 0 ? lines.filter((x) => key(x) !== key(l)) : lines.map((x) => (key(x) === key(l) ? { ...x, qty: n } : x)))}
              />
            </li>
          ))}
        </ul>
      )}
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن منتج..." className="input" />
      <ul className="max-h-72 divide-y divide-black/5 overflow-y-auto text-[13px]">
        {shown.map((p) =>
          p.variants?.length ? (
            <li key={p.id} className="space-y-1.5 py-2">
              <div className="font-semibold">{p.title}</div>
              <div className="flex flex-wrap gap-1.5">
                {p.variants.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    disabled={v.stock === 0}
                    onClick={() => add(p, v)}
                    className="rounded-lg border border-black/15 px-2 py-1 hover:bg-[#f7f7f7] disabled:opacity-40"
                  >
                    {v.title} · {money(Number(v.price ?? p.price))}
                    {v.stock != null && <span className="text-muted"> ({v.stock})</span>}
                  </button>
                ))}
              </div>
            </li>
          ) : (
            <li key={p.id}>
              <button type="button" disabled={p.stock === 0} onClick={() => add(p)} className="flex w-full justify-between py-2 text-right hover:bg-[#f7f7f7] disabled:opacity-40">
                <span className="font-semibold">{p.title}</span>
                <span className="text-muted">
                  {money(Number(p.price))}
                  {p.stock != null && ` · ${p.stock} بالمخزون`}
                </span>
              </button>
            </li>
          ),
        )}
      </ul>
    </section>
  );
}
