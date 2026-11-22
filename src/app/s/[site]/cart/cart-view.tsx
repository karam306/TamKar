"use client";

import { useEffect, useState, useTransition } from "react";
import { useStore } from "@/components/store-context";
import { StoreLink } from "@/components/store-ui";
import { formatPrice } from "@/lib/format";
import { contentId } from "@/lib/product-utils";
import { track } from "@/components/tracking";
import type { Fulfillment, PaymentMethod, Pricing } from "@/lib/types";
import { WALLETS } from "@/lib/wallets";
import {
  getCartLines,
  placeOrder,
  quoteCart,
  type CartLine,
  type PlaceOrderResult,
} from "./actions";
import { WalletPay } from "./wallet-pay";

const keyOf = (productId: string, variantId?: string) =>
  `${productId}|${variantId ?? ""}`;

export function CartView({
  site,
  defaultCity,
  cities,
  delivery,
  pickupNote,
  storeCity,
  branches,
  payments,
  gift: giftAllowed = false,
}: {
  site: string;
  defaultCity: string;
  cities: string[];
  delivery: boolean;
  pickupNote: string;
  storeCity: string;
  branches: { id: string; name: string; note: string }[];
  payments: PaymentMethod[];
  gift?: boolean;
}) {
  const [isGift, setIsGift] = useState(false);
  const [payment, setPayment] = useState<PaymentMethod>(payments[0] ?? "cod");
  const [branch, setBranch] = useState("");
  // Pickup from the shop is the default; delivery only when the shop offers it.
  const [method, setMethod] = useState<Fulfillment>("pickup");
  const { cart, setQty, clear, currency, ready } = useStore();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [done, setDone] = useState<{
    number: number;
    total: number;
    whatsappUrl: string;
    wallet: Extract<PlaceOrderResult, { ok: true }>["wallet"];
  } | null>(null);
  const [details, setDetails] = useState<Record<string, CartLine> | null>(null);
  const [city, setCity] = useState(
    cities.length && !cities.includes(defaultCity) ? "" : defaultCity,
  );
  const [codeInput, setCodeInput] = useState("");
  const [code, setCode] = useState("");
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [codeError, setCodeError] = useState("");
  const [checkoutTracked, setCheckoutTracked] = useState(false);

  // Fetch current prices for the items in the cart (only when the set of items changes).
  const itemsKey = cart
    .map((i) => keyOf(i.productId, i.variantId))
    .sort()
    .join(",");
  useEffect(() => {
    if (!ready) return;
    let alive = true;
    getCartLines(
      site,
      itemsKey
        ? itemsKey.split(",").map((k) => ({
            productId: k.split("|")[0],
            variantId: k.split("|")[1] || undefined,
            qty: 1,
          }))
        : [],
    ).then((lines) => {
      if (alive)
        setDetails(
          Object.fromEntries(
            lines.map((l) => [keyOf(l.productId, l.variantId), l]),
          ),
        );
    });
    return () => {
      alive = false;
    };
  }, [site, itemsKey, ready]);

  // Price breakdown (discount + delivery) from the server, same rules as checkout.
  const qtyKey = cart
    .map((i) => `${keyOf(i.productId, i.variantId)}:${i.qty}`)
    .sort()
    .join(",");
  useEffect(() => {
    if (!ready || !qtyKey) return;
    let alive = true;
    const t = setTimeout(() => {
      quoteCart(site, cart, city, code, method).then((r) => {
        if (!alive) return;
        if ("error" in r) {
          setCodeError(r.error);
          setCode("");
        } else {
          setPricing(r);
        }
      });
    }, 300);
    return () => {
      alive = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [site, qtyKey, city, code, ready, method]);

  if (done?.wallet) {
    return (
      <WalletPay
        number={done.number}
        total={done.total}
        currency={currency}
        whatsappUrl={done.whatsappUrl}
        wallet={done.wallet}
      />
    );
  }

  if (done) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="mb-4 text-5xl">🎉</div>
        <h1 className="mb-2 text-3xl">تم استلام طلبك</h1>
        <p className="mb-8 text-muted">
          رقم الطلب #{done.number}. آخر خطوة: ابعت الطلب للمتجر على واتساب
          ليأكدوه معك.
        </p>
        <a
          href={done.whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn w-full !bg-[#25D366]"
        >
          أرسل الطلب على واتساب
        </a>
        <StoreLink href="/" className="mt-4 inline-block text-sm text-primary">
          الرجوع للمتجر
        </StoreLink>
      </div>
    );
  }

  if (!ready || (cart.length > 0 && details === null))
    return <div className="py-24 text-center text-muted">...</div>;

  const lines = cart
    .map((i) => ({ ...i, info: details?.[keyOf(i.productId, i.variantId)] }))
    .filter((l): l is typeof l & { info: CartLine } => Boolean(l.info));
  const subtotal = lines.reduce((s, l) => s + l.info.price * l.qty, 0);
  const shown =
    pricing && Math.abs(pricing.subtotal - subtotal) < 0.01 ? pricing : null;

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="mb-4 text-2xl">السلة فاضية</h1>
        <StoreLink href="/products" className="btn">
          تصفح المنتجات
        </StoreLink>
      </div>
    );
  }

  function submit(form: FormData) {
    setError("");
    startTransition(async () => {
      const res = await placeOrder(site, {
        customerName: String(form.get("name") || ""),
        phone: String(form.get("phone") || ""),
        city: String(form.get("city") || ""),
        address: String(form.get("address") || ""),
        notes: String(form.get("notes") || ""),
        discountCode: code || undefined,
        method,
        branch: method === "pickup" && branch ? branch : undefined,
        payment,
        gift:
          isGift && method === "delivery"
            ? {
                to_name: String(form.get("gift_name") || ""),
                to_phone: String(form.get("gift_phone") || "") || null,
                message: String(form.get("gift_message") || "") || null,
                hide_prices: form.get("gift_hide") === "on",
              }
            : null,
        items: lines.map((l) => ({
          productId: l.productId,
          variantId: l.variantId,
          qty: l.qty,
        })),
      });
      if (!res.ok) return setError(res.error);
      track.purchase(
        res.id,
        res.total,
        currency,
        lines.map((l) => ({
          id: contentId(l.productId, l.variantId),
          quantity: l.qty,
        })),
      );
      clear();
      setDone({
        number: res.number,
        total: res.total,
        whatsappUrl: res.whatsappUrl,
        wallet: res.wallet ?? null,
      });
      window.scrollTo({ top: 0 });
    });
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[1fr_400px]">
      <section>
        <h1 className="mb-6 text-3xl">السلة</h1>
        <ul className="divide-y divide-black/5">
          {lines.map((l) => (
            <li
              key={keyOf(l.productId, l.variantId)}
              className="flex items-center gap-4 py-4"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={l.info.image || "/demo/k1.svg"}
                alt=""
                className="h-20 w-20 rounded-theme bg-surface object-cover"
              />
              <div className="flex-1">
                <div className="text-sm leading-6">{l.info.title}</div>
                {l.info.variantTitle && (
                  <div className="text-xs text-muted">
                    {l.info.variantTitle}
                  </div>
                )}
                <div className="text-sm text-primary">
                  {formatPrice(l.info.price, currency)}
                </div>
                {!l.info.available && (
                  <div className="text-xs text-red-700">نفدت الكمية</div>
                )}
              </div>
              <div className="flex items-center rounded-theme border border-black/10">
                <button
                  type="button"
                  className="px-3 py-1 text-lg"
                  onClick={() => setQty(l.productId, l.qty + 1, l.variantId)}
                  aria-label="زيادة"
                >
                  +
                </button>
                <span className="w-8 text-center">{l.qty}</span>
                <button
                  type="button"
                  className="px-3 py-1 text-lg"
                  onClick={() => setQty(l.productId, l.qty - 1, l.variantId)}
                  aria-label="إنقاص"
                >
                  −
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="h-fit rounded-theme bg-surface p-5">
        <h2 className="mb-4 text-xl">إتمام الطلب</h2>
        {delivery && (
          <div className="mb-4 grid grid-cols-2 gap-2">
            {(["pickup", "delivery"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                aria-pressed={method === m}
                className={`rounded-theme border-2 p-3 text-sm ${method === m ? "border-primary bg-white font-semibold" : "border-black/10"}`}
              >
                <div className="text-lg">{m === "pickup" ? "🏪" : "🚚"}</div>
                {m === "pickup" ? "استلام من المحل" : "توصيل"}
              </button>
            ))}
          </div>
        )}
        {method === "pickup" && branches.length === 0 && (
          <div className="mb-4 rounded-theme bg-white p-3 text-sm">
            <div className="font-semibold">🏪 الاستلام من المحل</div>
            <div className="text-muted">
              {pickupNote ||
                (storeCity
                  ? `من محلنا بـ${storeCity}. منتواصل معك لنحدد الوقت.`
                  : "منتواصل معك لنحدد الوقت والمكان.")}
            </div>
          </div>
        )}
        {method === "pickup" && branches.length > 0 && (
          <div className="mb-4 space-y-2">
            <div className="text-sm font-semibold">🏪 من أي فرع بدك تستلم؟</div>
            {[
              { id: "", name: "الفرع الرئيسي", note: pickupNote || storeCity },
              ...branches,
            ].map((b) => (
              <label
                key={b.id || "main"}
                className={`flex cursor-pointer gap-2 rounded-theme border-2 bg-white p-3 text-sm ${branch === b.id ? "border-primary" : "border-transparent"}`}
              >
                <input
                  type="radio"
                  name="branch_pick"
                  checked={branch === b.id}
                  onChange={() => setBranch(b.id)}
                  className="mt-1"
                />
                <span>
                  <b className="block">{b.name}</b>
                  {b.note && <span className="text-muted">{b.note}</span>}
                </span>
              </label>
            ))}
          </div>
        )}
        <form
          action={submit}
          className="flex flex-col gap-3"
          onFocus={() => {
            if (checkoutTracked) return;
            setCheckoutTracked(true);
            track.initiateCheckout(
              subtotal,
              currency,
              lines.reduce((s, l) => s + l.qty, 0),
            );
          }}
        >
          <input
            name="name"
            required
            placeholder="الاسم الكامل"
            className="input"
            autoComplete="name"
          />
          <input
            name="phone"
            required
            placeholder="رقم الموبايل (مثال 0912345678)"
            className="input"
            inputMode="tel"
            autoComplete="tel"
            dir="ltr"
            style={{ textAlign: "right" }}
          />
          {method === "delivery" &&
            (cities.length > 0 ? (
              <select
                name="city"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="input"
              >
                <option value="" disabled>
                  اختار المدينة
                </option>
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                <option value="أخرى">مدينة تانية</option>
              </select>
            ) : (
              <input
                name="city"
                required
                placeholder="المدينة"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="input"
              />
            ))}
          {method === "delivery" && (
            <textarea
              name="address"
              required
              placeholder="العنوان بالتفصيل (الحي، الشارع، أقرب معلم)"
              rows={3}
              className="input"
            />
          )}
          {giftAllowed && method === "delivery" && (
            <div
              className={`rounded-theme border-2 p-3 ${isGift ? "border-primary bg-white" : "border-transparent bg-white"}`}
            >
              <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={isGift}
                  onChange={(e) => setIsGift(e.target.checked)}
                  className="h-5 w-5"
                />
                🎁 ابعت الطلب كهدية لحدا تاني
              </label>
              {isGift && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-muted">
                    العنوان والمدينة فوق هنن عنوان الشخص اللي رح يستلم الهدية.
                    اسمك ورقمك منستخدمهم لنتواصل معك أنت.
                  </p>
                  <input
                    name="gift_name"
                    required
                    placeholder="اسم اللي رح يستلم الهدية"
                    className="input"
                    maxLength={80}
                  />
                  <input
                    name="gift_phone"
                    placeholder="رقمه (اختياري، ليتواصل معه المندوب)"
                    className="input"
                    inputMode="tel"
                    dir="ltr"
                    maxLength={20}
                  />
                  <textarea
                    name="gift_message"
                    placeholder="رسالة على كرت الهدية (اختياري)"
                    rows={2}
                    className="input"
                    maxLength={300}
                  />
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="gift_hide"
                      defaultChecked
                      className="h-4 w-4"
                    />{" "}
                    لا تحطوا فاتورة أو أسعار مع الهدية
                  </label>
                </div>
              )}
            </div>
          )}
          <textarea
            name="notes"
            placeholder="ملاحظات (اختياري)"
            rows={2}
            className="input"
          />

          <div className="flex gap-2">
            <input
              value={codeInput}
              onChange={(e) => {
                setCodeInput(e.target.value);
                setCodeError("");
              }}
              placeholder="كود الخصم"
              className="input"
              dir="ltr"
            />
            <button
              type="button"
              className="btn btn-outline !px-4"
              onClick={() => setCode(codeInput.trim())}
              disabled={!codeInput.trim()}
            >
              تطبيق
            </button>
          </div>
          {codeError && <p className="text-sm text-red-700">{codeError}</p>}

          <div className="mt-2 space-y-1.5 border-t border-black/10 pt-4 text-sm">
            <div className="flex justify-between">
              <span>المجموع الفرعي</span>
              <span>{formatPrice(subtotal, currency)}</span>
            </div>
            {shown && shown.discount > 0 && (
              <div className="flex justify-between text-green-700">
                <span>الخصم {shown.code && `(${shown.code})`}</span>
                <span>-{formatPrice(shown.discount, currency)}</span>
              </div>
            )}
            {method === "delivery" && (
              <div className="flex justify-between">
                <span>التوصيل</span>
                <span>
                  {!city
                    ? "اختار المدينة"
                    : shown
                      ? shown.shipping
                        ? formatPrice(shown.shipping, currency)
                        : "مجاني"
                      : "..."}
                </span>
              </div>
            )}
            <div className="flex justify-between pt-1 text-lg">
              <span>المجموع</span>
              <span className="font-semibold text-primary">
                {formatPrice(shown ? shown.total : subtotal, currency)}
              </span>
            </div>
          </div>
          {payments.length > 1 ? (
            <div className="space-y-2">
              <div className="text-sm font-semibold">طريقة الدفع</div>
              {payments.map((p) => (
                <label
                  key={p}
                  className={`flex cursor-pointer items-center gap-2 rounded-theme border-2 bg-white p-3 text-sm ${payment === p ? "border-primary font-semibold" : "border-transparent"}`}
                >
                  <input
                    type="radio"
                    name="payment_pick"
                    checked={payment === p}
                    onChange={() => setPayment(p)}
                  />
                  <span className="text-lg">
                    {p === "cod" ? "💵" : WALLETS[p].icon}
                  </span>
                  <span>
                    {p === "cod"
                      ? method === "pickup"
                        ? "كاش بالمحل عند الاستلام"
                        : "كاش عند الاستلام"
                      : `ادفع هلق عبر ${WALLETS[p].name}`}
                  </span>
                </label>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">
              {payment === "cod"
                ? `💵 ${method === "pickup" ? "الدفع بالمحل عند الاستلام" : "الدفع عند الاستلام"}`
                : `${WALLETS[payment].icon} الدفع بتحويل ${WALLETS[payment].name}، بنعطيك التفاصيل بعد تأكيد الطلب`}
            </p>
          )}
          {error && (
            <p className="rounded-theme bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}
          <button type="submit" disabled={pending} className="btn w-full">
            {pending ? "جاري الإرسال..." : "تأكيد الطلب"}
          </button>
        </form>
      </section>
    </div>
  );
}
