import { formatPrice } from "@/lib/format";
import type { Quote, Store } from "@/lib/types";

/** The price quote as the customer sees it (and as it prints to PDF). */
export function QuoteView({ store, quote: q }: { store: Pick<Store, "name" | "city" | "whatsapp" | "logo_url" | "currency">; quote: Quote }) {
  const money = (n: number) => formatPrice(n, store.currency);
  const day = (d: string) => new Intl.DateTimeFormat("ar-SY", { dateStyle: "long", timeZone: "Asia/Damascus" }).format(new Date(d));
  const subtotal = q.items.reduce((s, i) => s + Number(i.price) * Number(i.qty), 0);
  return (
    <>
      <header className="mb-8 flex items-start justify-between border-b border-black/10 pb-6">
        <div>
          {store.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={store.logo_url} alt="" className="mb-2 h-12" />
          ) : null}
          <div className="text-2xl font-bold">{store.name}</div>
          {store.city && <div className="text-muted">{store.city}</div>}
          <div dir="ltr" className="text-right text-muted">
            +{store.whatsapp}
          </div>
        </div>
        <div className="text-left">
          <div className="text-xl font-bold">عرض سعر</div>
          <div>رقم {q.number}</div>
          <div className="text-muted">{day(q.created_at)}</div>
          {q.valid_until && <div className="text-muted">صالح حتى {day(q.valid_until + "T12:00:00Z")}</div>}
        </div>
      </header>

      <section className="mb-6">
        <div className="mb-1 font-semibold">إلى</div>
        <div>{q.customer_name}</div>
        {q.phone && (
          <div dir="ltr" className="text-right">
            {q.phone}
          </div>
        )}
      </section>

      <table className="mb-6 w-full">
        <thead>
          <tr className="border-b border-black/20 text-right">
            <th className="py-2">المنتج</th>
            <th className="py-2">الكمية</th>
            <th className="py-2">السعر</th>
            <th className="py-2 text-left">المجموع</th>
          </tr>
        </thead>
        <tbody>
          {q.items.map((i, k) => (
            <tr key={k} className="border-b border-black/5">
              <td className="py-2">
                {i.title}
                {i.variantTitle && <div className="text-xs text-muted">{i.variantTitle}</div>}
              </td>
              <td className="py-2">{i.qty}</td>
              <td className="py-2">{money(Number(i.price))}</td>
              <td className="py-2 text-left">{money(Number(i.price) * Number(i.qty))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mr-auto w-64 space-y-1">
        <div className="flex justify-between">
          <span>المجموع الفرعي</span>
          <span>{money(subtotal)}</span>
        </div>
        {Number(q.discount) > 0 && (
          <div className="flex justify-between">
            <span>الخصم</span>
            <span>-{money(Number(q.discount))}</span>
          </div>
        )}
        {Number(q.delivery_fee) > 0 && (
          <div className="flex justify-between">
            <span>التوصيل</span>
            <span>{money(Number(q.delivery_fee))}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-black/20 pt-1 text-lg font-bold">
          <span>المجموع</span>
          <span>{money(Number(q.total))}</span>
        </div>
      </div>
      {q.notes && <p className="mt-6 whitespace-pre-line text-muted">ملاحظات: {q.notes}</p>}
      <footer className="mt-12 text-center text-muted">للموافقة على العرض تواصل معنا عبر واتساب على الرقم +{store.whatsapp}</footer>
    </>
  );
}
