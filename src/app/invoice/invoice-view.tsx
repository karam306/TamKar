import { MadeWithKun, StoreLogo } from "@/components/doc-brand";
import { money } from "@/lib/fx";
import type { Order, Store } from "@/lib/types";

/** The invoice itself, shared by the merchant's page and the customer's link. */
export function InvoiceView({ store, order: o }: { store: Pick<Store, "name" | "city" | "whatsapp" | "logo_url" | "currency">; order: Order }) {
  // The invoice uses the rate the order was placed at, not today's.
  const m = money(store.currency, o.fx ?? null);
  const t = m.totals(o.items, Number(o.discount_amount ?? 0), o.fulfillment !== "pickup" ? Number(o.shipping_fee ?? 0) : 0);
  const date = new Intl.DateTimeFormat("ar-SY", { dateStyle: "long", timeZone: "Asia/Damascus" }).format(new Date(o.created_at));
  return (
    <>
      <header className="mb-8 flex items-start justify-between border-b border-black/10 pb-6">
        <div>
          <StoreLogo src={store.logo_url} />
          <div className="text-2xl font-bold">{store.name}</div>
          {store.city && <div className="text-muted">{store.city}</div>}
          <div dir="ltr" className="text-right text-muted">
            +{store.whatsapp}
          </div>
        </div>
        <div className="text-left">
          <div className="text-xl font-bold">فاتورة</div>
          <div>طلب #{o.number}</div>
          <div className="text-muted">{date}</div>
        </div>
      </header>

      <section className="mb-6 grid grid-cols-2 gap-4">
        <div>
          <div className="mb-1 font-semibold">إلى</div>
          <div>{o.customer_name}</div>
          <div dir="ltr" className="text-right">
            {o.phone}
          </div>
          <div>{o.fulfillment === "pickup" ? `الاستلام من ${o.branch || "المحل"}` : `${o.city}، ${o.address}`}</div>
        </div>
        <div>
          <div className="mb-1 font-semibold">الدفع</div>
          <div>{o.payment_status === "paid" ? "مدفوع" : "الدفع عند الاستلام"}</div>
        </div>
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
          {o.items.map((i, k) => (
            <tr key={k} className="border-b border-black/5">
              <td className="py-2">
                {i.title}
                {i.variantTitle && <div className="text-xs text-muted">{i.variantTitle}</div>}
                {i.offer ? <div className="text-xs text-muted">عرض الكمية: خصم {i.offer}٪</div> : null}
              </td>
              <td className="py-2">{i.qty}</td>
              <td className="py-2">{m.price(i.price)}</td>
              <td className="py-2 text-left">{m.text(m.unit(i.price) * i.qty)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mr-auto w-64 space-y-1">
        <div className="flex justify-between">
          <span>المجموع الفرعي</span>
          <span>{m.text(t.subtotal)}</span>
        </div>
        {Number(o.discount_amount ?? 0) > 0 && (
          <div className="flex justify-between">
            <span>الخصم {o.discount_code && `(${o.discount_code})`}</span>
            <span>-{m.text(t.discount)}</span>
          </div>
        )}
        {o.fulfillment !== "pickup" && (
          <div className="flex justify-between">
            <span>التوصيل</span>
            <span>{t.shipping ? m.text(t.shipping) : "مجاني"}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-black/20 pt-1 text-lg font-bold">
          <span>المجموع</span>
          <span>{m.text(t.total, Number(o.total))}</span>
        </div>
        {o.fx && <div className="pt-1 text-[12px] text-muted">بسعر صرف {o.fx.rate} ل.س للدولار</div>}
      </div>
      {o.notes && <p className="mt-6 text-muted">ملاحظات: {o.notes}</p>}
      <footer className="mt-12 text-center text-muted">شكراً لتسوقكم من {store.name}</footer>
      <MadeWithKun />
    </>
  );
}
