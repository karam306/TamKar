import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getMerchant } from "@/lib/auth";
import { formatPrice } from "@/lib/format";
import type { Order } from "@/lib/types";
import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: "فاتورة", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const m = await getMerchant();
  if (!m) redirect("/login");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { data } = await m.db.from("orders").select("*").eq("id", id).eq("store_id", m.store.id).maybeSingle();
  if (!data) notFound();
  const o = data as Order;
  const money = (n: number) => formatPrice(n, m.store.currency);
  const date = new Intl.DateTimeFormat("ar-SY", { dateStyle: "long", timeZone: "Asia/Damascus" }).format(new Date(o.created_at));

  return (
    <div data-theme="classic" className="mx-auto max-w-2xl bg-white p-8 font-sans text-[14px] print:p-0">
      <div className="mb-6 flex justify-end print:hidden">
        <PrintButton />
      </div>
      <header className="mb-8 flex items-start justify-between border-b border-black/10 pb-6">
        <div>
          {m.store.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={m.store.logo_url} alt="" className="mb-2 h-12" />
          ) : null}
          <div className="text-2xl font-bold">{m.store.name}</div>
          {m.store.city && <div className="text-muted">{m.store.city}</div>}
          <div dir="ltr" className="text-right text-muted">
            +{m.store.whatsapp}
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
          <div>
            {o.city}، {o.address}
          </div>
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
        <div className="flex justify-between">
          <span>التوصيل</span>
          <span>{Number(o.shipping_fee ?? 0) ? money(Number(o.shipping_fee)) : "مجاني"}</span>
        </div>
        <div className="flex justify-between border-t border-black/20 pt-1 text-lg font-bold">
          <span>المجموع</span>
          <span>{money(Number(o.total))}</span>
        </div>
      </div>
      {o.notes && <p className="mt-6 text-muted">ملاحظات: {o.notes}</p>}
      <footer className="mt-12 text-center text-muted">شكراً لتسوقكم من {m.store.name}</footer>
    </div>
  );
}
