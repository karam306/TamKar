import { liveLoyalty } from "@/lib/loyalty";
import type { Product, Store } from "@/lib/types";
import { storeWallets, WALLETS } from "@/lib/wallets";

/** Small line icons for the storefront (stroke uses the text color). */
const ICON = {
  pay: "M3 7h18v10H3zM3 11h18M7 15h3",
  pickup: "M4 10l1.5-5h13L20 10M4 10v9h16v-9M4 10h16M9 19v-5h6v5",
  delivery: "M3 7h11v9H3zM14 10h4l3 3v3h-7M7 19a2 2 0 1 0 0-.01M17 19a2 2 0 1 0 0-.01",
  chat: "M4 5h16v11H9l-5 4z",
  star: "M12 4l2.4 5 5.6.6-4.2 3.8 1.2 5.6L12 16.3 7 19l1.2-5.6L4 9.6 9.6 9z",
};

function Icon({ d }: { d: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0 text-primary">
      <path d={d} />
    </svg>
  );
}

/**
 * What a first-time customer wants to know before ordering: how to pay, how to get it,
 * and how the order is confirmed. Filled in from the store's own settings.
 */
export function TrustStrip({ store }: { store: Store }) {
  const wallets = storeWallets(store).map((w) => WALLETS[w.id].name);
  const delivery = Boolean(store.shipping?.delivery);
  const items = [
    {
      icon: ICON.pay,
      title: wallets.length ? "الدفع عند الاستلام أو تحويلاً" : "الدفع عند الاستلام",
      text: wallets.length ? `نقداً، أو عبر ${wallets.join(" أو ")}` : "لا دفع مسبق",
    },
    delivery
      ? { icon: ICON.delivery, title: "توصيل أو استلام من المحل", text: store.delivery_note || store.city || "" }
      : { icon: ICON.pickup, title: "استلام من المحل", text: store.shipping?.pickup_note || store.city || "" },
    { icon: ICON.chat, title: "تأكيد الطلب عبر واتساب", text: "نتواصل معك قبل التجهيز" },
    ...(liveLoyalty(store) ? [{ icon: ICON.star, title: "نقاط مع كل طلب", text: "تستبدلها بخصم لاحقاً" }] : []),
  ];
  return (
    <section className="border-b border-black/5">
      <div className={`mx-auto grid max-w-6xl grid-cols-1 gap-x-6 gap-y-3 px-4 py-5 sm:grid-cols-2 ${items.length > 3 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
        {items.map((it) => (
          <div key={it.title} className="flex items-center gap-3">
            <Icon d={it.icon} />
            <div className="min-w-0">
              <div className="text-sm font-semibold">{it.title}</div>
              {it.text && <div className="truncate text-xs text-muted">{it.text}</div>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Three steps, for customers ordering online for the first time. */
export function HowToOrder({ store }: { store: Store }) {
  const delivery = Boolean(store.shipping?.delivery);
  const steps = [
    { title: "اختر منتجاتك", text: "أضف ما يعجبك إلى السلة، واختر الكمية والخيارات." },
    { title: "أرسل الطلب عبر واتساب", text: "يصلنا طلبك مرتباً، ونؤكده معك برسالة." },
    {
      title: delivery ? "استلم طلبك" : "استلمه من المحل",
      text: delivery ? "نوصله إليك أو تستلمه من المحل، وتدفع عند الاستلام." : "تجده جاهزاً في الموعد، وتدفع عند الاستلام.",
    },
  ];
  return (
    <section className="mx-auto max-w-6xl px-4 pt-16">
      <h2 className="mb-6 text-2xl">كيف تطلب</h2>
      <ol className="grid gap-4 sm:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s.title} className="flex gap-4 rounded-theme bg-surface p-5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">{i + 1}</span>
            <div>
              <div className="mb-1 font-semibold">{s.title}</div>
              <p className="text-sm leading-6 text-muted">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Hero picture when the merchant has not uploaded one: their own best products. */
export function ProductMosaic({ products }: { products: Product[] }) {
  const pics = products.filter((p) => p.images[0]).slice(0, 3);
  if (pics.length < 2) return null;
  return (
    <div className="grid h-full grid-cols-2 grid-rows-2 gap-3">
      {pics.map((p, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={p.id}
          src={p.images[0]}
          alt=""
          className={`h-full w-full rounded-theme bg-white object-cover shadow-sm ${i === 0 ? "row-span-2" : ""} ${pics.length === 2 && i === 1 ? "row-span-2" : ""}`}
        />
      ))}
    </div>
  );
}
