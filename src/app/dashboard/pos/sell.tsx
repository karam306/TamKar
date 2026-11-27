"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { money, type Fx } from "@/lib/fx";
import { searchProducts } from "@/lib/search";
import { offerPrice, type QtyOffer } from "@/lib/offers";
import type { CartItem, Currency, Variant } from "@/lib/types";
import { sellInStore, type SaleResult } from "./actions";

export type PosProduct = {
  id: string;
  title: string;
  price: number;
  image: string | null;
  sku: string | null;
  category: string | null;
  stock: number | null;
  variants: Variant[];
  offers: QtyOffer[];
};

type Line = CartItem & { title: string; price: number; max: number | null; offers: QtyOffer[] };
type Pay = "cash" | "sham_cash" | "syriatel_cash" | "mtn_cash" | "credit";

const WALLET_NAMES: Record<string, string> = {
  sham_cash: "شام كاش",
  syriatel_cash: "سيريتل كاش",
  mtn_cash: "MTN كاش",
};

export function Sell({
  products,
  currency,
  fx,
  wallets,
}: {
  products: PosProduct[];
  currency: Currency;
  fx: Fx | null;
  wallets: string[];
}) {
  const m = money(currency, fx);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null); // product showing its variants
  const [lines, setLines] = useState<Line[]>([]);
  const [pay, setPay] = useState<Pay>("cash");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [showCustomer, setShowCustomer] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState<Extract<SaleResult, { ok: true }> | null>(null);
  const [pending, start] = useTransition();

  const shown = useMemo(() => {
    const list = q.trim() ? searchProducts(products, q) : products;
    return list.slice(0, 60);
  }, [q, products]);

  const key = (l: CartItem) => `${l.productId}:${l.variantId ?? ""}`;
  const inCart = (productId: string, variantId?: string) =>
    lines.find((l) => key(l) === `${productId}:${variantId ?? ""}`)?.qty ?? 0;

  function add(p: PosProduct, v?: Variant) {
    const max = v ? (v.stock ?? null) : p.stock;
    const k = `${p.id}:${v?.id ?? ""}`;
    setLines((ls) => {
      const found = ls.find((l) => key(l) === k);
      if (found) {
        if (max != null && found.qty >= max) return ls;
        return ls.map((l) => (key(l) === k ? { ...l, qty: l.qty + 1 } : l));
      }
      if (max != null && max <= 0) return ls;
      return [
        ...ls,
        { productId: p.id, variantId: v?.id, qty: 1, title: v ? `${p.title} (${v.title})` : p.title, price: v?.price ?? p.price, max, offers: p.offers },
      ];
    });
    setOpen(null);
    setError("");
  }

  function setQty(k: string, qty: number) {
    setLines((ls) =>
      ls
        .map((l) => (key(l) === k ? { ...l, qty: l.max != null ? Math.min(qty, l.max) : qty } : l))
        .filter((l) => l.qty > 0),
    );
  }

  // Quantity offers: all variants of a product count together, like the database.
  const perProduct = new Map<string, number>();
  for (const l of lines) perProduct.set(l.productId, (perProduct.get(l.productId) ?? 0) + l.qty);
  const unitOf = (l: Line) => offerPrice(l.price, l.offers, perProduct.get(l.productId) ?? 0);
  const totals = m.totals(lines.map((l) => ({ price: unitOf(l), qty: l.qty })));
  const count = lines.reduce((s, l) => s + l.qty, 0);

  function finish() {
    setError("");
    start(async () => {
      const res = await sellInStore({
        items: lines.map(({ productId, variantId, qty }) => ({ productId, variantId, qty })),
        name,
        phone,
        pay,
        code,
      });
      if (!res.ok) return setError(res.error);
      setDone(res);
    });
  }

  function reset() {
    setDone(null);
    setLines([]);
    setName("");
    setPhone("");
    setPay("cash");
    setShowCustomer(false);
    setCode("");
    setQ("");
  }

  if (done) {
    const to = done.phone ? done.phone.replace(/\D/g, "").replace(/^0/, "963") : "";
    return (
      <div className="card mx-auto max-w-md space-y-4 p-6 text-center">
        <div className="text-4xl">✓</div>
        <h2 className="text-lg font-semibold">تم البيع، رقم #{done.number}</h2>
        <p className="text-[13px] text-muted">نقص المخزون، وأُضيفت البيعة إلى الطلبات والتقارير.</p>
        <div className="flex flex-col gap-2">
          <a
            href={`https://wa.me/${to}?text=${encodeURIComponent(done.receipt)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn"
          >
            إرسال الإيصال عبر واتساب
          </a>
          <Link href={`/dashboard/orders/${done.id}`} className="btn btn-outline">
            فتح الطلب
          </Link>
          <button type="button" className="btn btn-outline" onClick={reset}>
            بيع جديد
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 pb-40 lg:grid-cols-[1fr_360px] lg:pb-0">
      <section className="space-y-3">
        <input
          className="input !py-3 text-base"
          placeholder="ابحث باسم المنتج أو رمزه"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
        />
        {shown.length === 0 ? (
          <p className="card p-6 text-center text-[13px] text-muted">لا منتج بهذا الاسم.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
            {shown.map((p) => {
              const hasV = p.variants.length > 0;
              const stock = hasV
                ? p.variants.some((v) => v.stock == null)
                  ? null
                  : p.variants.reduce((s, v) => s + (v.stock ?? 0), 0)
                : p.stock;
              const out = stock != null && stock <= 0;
              const n = hasV ? p.variants.reduce((s, v) => s + inCart(p.id, v.id), 0) : inCart(p.id);
              return (
                <li key={p.id} className="relative">
                  <button
                    type="button"
                    disabled={out}
                    onClick={() => (hasV ? setOpen(open === p.id ? null : p.id) : add(p))}
                    className={`card flex h-full w-full flex-col overflow-hidden text-right transition ${out ? "opacity-40" : "hover:shadow-md active:scale-[0.98]"} ${n ? "ring-2 ring-[#303030]" : ""}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.image || "/demo/k1.svg"} alt="" className="aspect-[4/3] w-full bg-[#f4f4f0] object-cover" />
                    <span className="flex flex-1 flex-col gap-0.5 p-2">
                      <span className="line-clamp-2 text-[13px] font-semibold leading-snug">{p.title}</span>
                      <span className="text-[13px]">{m.price(p.price)}</span>
                      <span className="text-[11px] text-muted">
                        {out ? "نفدت الكمية" : stock != null ? `المتوفر: ${stock}` : hasV ? `${p.variants.length} خيارات` : ""}
                      </span>
                    </span>
                    {n > 0 && (
                      <span className="absolute left-2 top-2 rounded-full bg-[#303030] px-2 py-0.5 text-[12px] font-bold text-white">{n}</span>
                    )}
                  </button>
                  {open === p.id && (
                    <div className="absolute inset-x-0 top-full z-20 mt-1 space-y-1 rounded-lg border border-black/10 bg-white p-2 shadow-lg">
                      {p.variants.map((v) => {
                        const vOut = v.stock != null && v.stock <= 0;
                        return (
                          <button
                            key={v.id}
                            type="button"
                            disabled={vOut}
                            onClick={() => add(p, v)}
                            className="flex w-full justify-between rounded-md px-2 py-1.5 text-[13px] hover:bg-black/5 disabled:opacity-40"
                          >
                            <span>{v.title}</span>
                            <span className="text-muted">{vOut ? "نفد" : m.price(v.price)}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* The bill: fixed at the bottom on phones, a side panel on computers. */}
      <aside className="fixed inset-x-0 bottom-0 z-30 max-h-[70vh] overflow-auto border-t border-black/10 bg-white p-4 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] lg:sticky lg:top-20 lg:max-h-[calc(100vh-7rem)] lg:self-start lg:rounded-xl lg:border lg:shadow-none">
        {lines.length === 0 ? (
          <p className="py-2 text-center text-[13px] text-muted">اضغط على منتج لإضافته إلى الفاتورة.</p>
        ) : (
          <div className="space-y-3">
            <ul className="max-h-48 divide-y divide-black/5 overflow-auto text-[13px] lg:max-h-none">
              {lines.map((l) => (
                <li key={key(l)} className="flex items-center gap-2 py-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{l.title}</span>
                    <span className="text-muted">
                      {m.text(m.unit(unitOf(l)) * l.qty)}
                      {unitOf(l) < l.price && <span className="text-green-700"> · عرض الكمية</span>}
                    </span>
                  </span>
                  <span className="flex items-center gap-1">
                    <button type="button" className="h-8 w-8 rounded-full border border-black/15 text-base" onClick={() => setQty(key(l), l.qty - 1)} aria-label="إنقاص">−</button>
                    <span className="w-6 text-center font-semibold">{l.qty}</span>
                    <button
                      type="button"
                      className="h-8 w-8 rounded-full border border-black/15 text-base disabled:opacity-30"
                      disabled={l.max != null && l.qty >= l.max}
                      onClick={() => setQty(key(l), l.qty + 1)}
                      aria-label="زيادة"
                    >
                      +
                    </button>
                  </span>
                </li>
              ))}
            </ul>

            <div className="flex items-baseline justify-between border-t border-black/10 pt-2">
              <span className="text-[13px] text-muted">{count} قطعة</span>
              <span className="text-xl font-bold">{m.text(totals.total)}</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {(["cash", ...wallets, "credit"] as Pay[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setPay(p);
                    if (p === "credit") setShowCustomer(true);
                  }}
                  className={`rounded-full border px-3 py-1.5 text-[13px] ${pay === p ? "border-[#303030] bg-[#303030] text-white" : "border-black/15"}`}
                >
                  {p === "cash" ? "نقداً" : p === "credit" ? "بالآجل" : WALLET_NAMES[p]}
                </button>
              ))}
            </div>

            {showCustomer ? (
              <div className="grid grid-cols-2 gap-2">
                <input className="input" placeholder={pay === "credit" ? "اسم الزبون (مطلوب)" : "اسم الزبون"} value={name} onChange={(e) => setName(e.target.value)} />
                <input className="input" dir="ltr" inputMode="tel" placeholder={pay === "credit" ? "الهاتف (مطلوب)" : "الهاتف"} value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            ) : (
              <button type="button" className="text-[13px] text-[#005bd3] hover:underline" onClick={() => setShowCustomer(true)}>
                + إضافة بيانات الزبون (لإرسال الإيصال إليه)
              </button>
            )}

            <input
              className="input"
              dir="ltr"
              placeholder="كود خصم (اختياري)"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
            {code && <p className="text-[12px] text-muted">يُطبَّق الخصم عند إتمام البيع، ويظهر في الإيصال.</p>}
            {error && <p className="text-[13px] text-red-700">{error}</p>}
            <div className="flex gap-2">
              <button type="button" className="btn flex-1 !py-3 text-base" disabled={pending} onClick={finish}>
                {pending ? "جارٍ الحفظ..." : pay === "credit" ? "تسجيل البيع بالآجل" : "إتمام البيع"}
              </button>
              <button type="button" className="btn btn-outline" onClick={() => setLines([])} disabled={pending}>
                إفراغ
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
