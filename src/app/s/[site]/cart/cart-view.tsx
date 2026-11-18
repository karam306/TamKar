"use client";

import { useState, useTransition } from "react";
import { useStore } from "@/components/store-context";
import { StoreLink } from "@/components/store-ui";
import { formatPrice } from "@/lib/format";
import { placeOrder } from "./actions";

type P = { id: string; title: string; price: number; image: string; stock: number | null };

export function CartView({ site, products, defaultCity }: { site: string; products: P[]; defaultCity: string }) {
  const { cart, setQty, clear, currency, ready } = useStore();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ number: number; whatsappUrl: string } | null>(null);

  const lines = cart
    .map((i) => ({ ...i, product: products.find((p) => p.id === i.productId) }))
    .filter((l): l is typeof l & { product: P } => Boolean(l.product));
  const total = lines.reduce((s, l) => s + l.product.price * l.qty, 0);

  if (done) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="mb-4 text-5xl">🎉</div>
        <h1 className="mb-2 text-3xl">تم استلام طلبك</h1>
        <p className="mb-8 text-muted">رقم الطلب #{done.number}. آخر خطوة: ابعت الطلب للمتجر على واتساب ليأكدوه معك.</p>
        <a href={done.whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn w-full !bg-[#25D366]">
          أرسل الطلب على واتساب
        </a>
        <StoreLink href="/" className="mt-4 inline-block text-sm text-primary">
          الرجوع للمتجر
        </StoreLink>
      </div>
    );
  }

  if (!ready) return <div className="py-24 text-center text-muted">...</div>;

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
        items: cart,
      });
      if (!res.ok) return setError(res.error);
      clear();
      setDone({ number: res.number, whatsappUrl: res.whatsappUrl });
    });
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[1fr_400px]">
      <section>
        <h1 className="mb-6 text-3xl">السلة</h1>
        <ul className="divide-y divide-black/5">
          {lines.map((l) => (
            <li key={l.productId} className="flex items-center gap-4 py-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={l.product.image} alt="" className="h-20 w-20 rounded-theme bg-surface object-cover" />
              <div className="flex-1">
                <div className="mb-1 text-sm leading-6">{l.product.title}</div>
                <div className="text-sm text-primary">{formatPrice(l.product.price, currency)}</div>
              </div>
              <div className="flex items-center rounded-theme border border-black/10">
                <button type="button" className="px-3 py-1 text-lg" onClick={() => setQty(l.productId, l.qty + 1)} aria-label="زيادة">
                  +
                </button>
                <span className="w-8 text-center">{l.qty}</span>
                <button type="button" className="px-3 py-1 text-lg" onClick={() => setQty(l.productId, l.qty - 1)} aria-label="إنقاص">
                  −
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="h-fit rounded-theme bg-surface p-5">
        <h2 className="mb-4 text-xl">معلومات التوصيل</h2>
        <form action={submit} className="flex flex-col gap-3">
          <input name="name" required placeholder="الاسم الكامل" className="input" autoComplete="name" />
          <input name="phone" required placeholder="رقم الموبايل (مثال 0912345678)" className="input" inputMode="tel" autoComplete="tel" dir="ltr" style={{ textAlign: "right" }} />
          <input name="city" required placeholder="المدينة" defaultValue={defaultCity} className="input" />
          <textarea name="address" required placeholder="العنوان بالتفصيل (الحي، الشارع، أقرب معلم)" rows={3} className="input" />
          <textarea name="notes" placeholder="ملاحظات (اختياري)" rows={2} className="input" />

          <div className="my-2 flex justify-between border-t border-black/10 pt-4 text-lg">
            <span>المجموع</span>
            <span className="font-semibold text-primary">{formatPrice(total, currency)}</span>
          </div>
          <p className="text-sm text-muted">💵 الدفع عند الاستلام</p>
          {error && <p className="rounded-theme bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={pending} className="btn w-full">
            {pending ? "جاري الإرسال..." : "تأكيد الطلب"}
          </button>
        </form>
      </section>
    </div>
  );
}
