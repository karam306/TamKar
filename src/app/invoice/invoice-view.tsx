import { MadeWithKun, StoreLogo } from "@/components/doc-brand";
import { formatPrice } from "@/lib/format";
import type { Order, Store } from "@/lib/types";

/** The invoice itself, shared by the merchant's page and the customer's link. */
export function InvoiceView({ store, order: o }: { store: Pick<Store, "name" | "city" | "whatsapp" | "logo_url" | "currency">; order: Order }) {
  const money = (n: number) => formatPrice(n, store.currency);
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
              </td>
              <td className="py-2">{i.qty}</td>
              <td className="py-2">{money(i.price)}</td>
              <td className="py-2 text-left">{money(i.price * i.qty)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mr-auto w-64 space-y-1">
        <div className="flex justify-between">
          <span>المجموع الفرعي</span>
          <span>{money(Number(o.subtotal ?? o.total))}</span>
        </div>
        {Number(o.discount_amount ?? 0) > 0 && (
          <div className="flex justify-between">
            <span>الخصم {o.discount_code && `(${o.discount_code})`}</span>
            <span>-{money(Number(o.discount_amount))}</span>
          </div>
        )}
        {o.fulfillment !== "pickup" && (
          <div className="flex justify-between">
            <span>التوصيل</span>
            <span>{Number(o.shipping_fee ?? 0) ? money(Number(o.shipping_fee)) : "مجاني"}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-black/20 pt-1 text-lg font-bold">
          <span>المجموع</span>
          <span>{money(Number(o.total))}</span>
        </div>
      </div>
      {o.notes && <p className="mt-6 text-muted">ملاحظات: {o.notes}</p>}
      <footer className="mt-12 text-center text-muted">شكراً لتسوقكم من {store.name}</footer>
      <MadeWithKun />
    </>
  );
}
