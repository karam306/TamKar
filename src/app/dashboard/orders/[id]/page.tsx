import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, PageHeader } from "@/components/admin-ui";
import { requireMerchant } from "@/lib/auth";
import { formatPrice, whatsappLink } from "@/lib/format";
import { normalizeWhatsapp } from "@/lib/templates";
import type { Order } from "@/lib/types";
import { addComment, cancelOrder, saveMerchantNote } from "../actions";
import {
  LiveOrder,
  LivePaidLabel,
  LivePaymentBadge,
  LiveStatusBadge,
  NextStepButton,
  PaidButton,
  StatusSelect,
} from "./live";

export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { store, db } = await requireMerchant();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [{ data }, { data: events }] = await Promise.all([
    db
      .from("orders")
      .select("*, customer:customers(id, orders_count)")
      .eq("id", id)
      .eq("store_id", store.id)
      .maybeSingle(),
    db
      .from("order_events")
      .select("*")
      .eq("order_id", id)
      .eq("store_id", store.id)
      .order("created_at", { ascending: false }),
  ]);
  if (!data) notFound();
  const o = data as Order;
  const customer =
    (data as { customer?: { id: string; orders_count: number } | null })
      .customer ?? null;

  const money = (n: number) => formatPrice(n, store.currency);
  const fmt = new Intl.DateTimeFormat("ar-SY", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Damascus",
  });
  const cancelled = o.status === "cancelled";
  const qty = o.items.reduce((s, i) => s + i.qty, 0);

  return (
    <LiveOrder status={o.status} payment={o.payment_status} pickup={o.fulfillment === "pickup"}>
      <div>
        <PageHeader
          back="/dashboard/orders"
          title={`#${o.number}`}
          badges={
            <>
              <LivePaymentBadge />
              <LiveStatusBadge />
            </>
          }
          actions={
            <>
              <a
                href={`/invoice/${o.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline"
              >
                طباعة الفاتورة
              </a>
            </>
          }
        />
        <p className="-mt-3 mb-5 text-[13px] text-muted">
          {fmt.format(new Date(o.created_at))} ·{" "}
          {o.source === "manual" ? "طلب يدوي" : "من المتجر الإلكتروني"}
        </p>

        <div className="grid items-start gap-4 lg:grid-cols-[1fr_300px]">
          <div className="space-y-4">
            <Card title={<LiveStatusBadge />}>
              <ul className="divide-y divide-black/5">
                {o.items.map((i, idx) => (
                  <li key={idx} className="flex items-center gap-3 py-2.5">
                    {i.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={i.image}
                        alt=""
                        className="h-11 w-11 rounded-lg border border-black/5 object-cover"
                      />
                    ) : (
                      <span className="h-11 w-11 rounded-lg bg-[#e3e3e3]" />
                    )}
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/dashboard/products/${i.productId}`}
                        className="font-semibold text-[#005bd3] hover:underline"
                      >
                        {i.title}
                      </Link>
                      {i.variantTitle && (
                        <div className="text-xs text-muted">
                          {i.variantTitle}
                        </div>
                      )}
                    </div>
                    <span className="whitespace-nowrap text-muted">
                      {money(i.price)} × {i.qty}
                    </span>
                    <span className="w-20 text-left font-semibold">
                      {money(i.price * i.qty)}
                    </span>
                  </li>
                ))}
              </ul>
              <NextStepButton id={o.id} />
            </Card>

            <Card title={<LivePaymentBadge />}>
              <div className="space-y-1.5 text-[13px]">
                <div className="flex justify-between">
                  <span>المجموع الفرعي</span>
                  <span className="text-muted">{qty} قطعة</span>
                  <span>{money(Number(o.subtotal ?? o.total))}</span>
                </div>
                {Number(o.discount_amount ?? 0) > 0 && (
                  <div className="flex justify-between">
                    <span>الخصم</span>
                    <span className="text-muted" dir="ltr">
                      {o.discount_code}
                    </span>
                    <span>-{money(Number(o.discount_amount))}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>
                    {o.fulfillment === "pickup" ? "الاستلام" : "التوصيل"}
                  </span>
                  <span className="text-muted">
                    {o.fulfillment === "pickup" ? "من المحل" : o.city}
                  </span>
                  <span>
                    {o.fulfillment === "pickup"
                      ? "-"
                      : Number(o.shipping_fee ?? 0)
                        ? money(Number(o.shipping_fee))
                        : "مجاني"}
                  </span>
                </div>
                <div className="flex justify-between border-t border-black/5 pt-2 font-semibold">
                  <span>المجموع</span>
                  <span>{money(Number(o.total))}</span>
                </div>
                <div className="flex justify-between">
                  <span>
                    <LivePaidLabel />
                  </span>
                  <span>{money(Number(o.total))}</span>
                </div>
              </div>
              <PaidButton id={o.id} />
            </Card>

            <Card title="السجل">
              <form action={addComment} className="mb-4 flex gap-2">
                <input type="hidden" name="id" value={o.id} />
                <input
                  name="message"
                  placeholder="اكتب ملاحظة للسجل..."
                  className="input"
                  maxLength={1000}
                />
                <button className="btn btn-outline">أضف</button>
              </form>
              <ol className="relative space-y-3 border-r-2 border-black/10 pr-4 text-[13px]">
                {(events ?? []).map((e) => (
                  <li key={e.id as string} className="relative">
                    <span className="absolute -right-[21px] top-1.5 h-2 w-2 rounded-full bg-[#8a8a8a]" />
                    <div>{e.message as string}</div>
                    <div className="text-xs text-muted">
                      {fmt.format(new Date(e.created_at as string))}
                    </div>
                  </li>
                ))}
              </ol>
            </Card>
          </div>

          <div className="space-y-4">
            {o.notes && (
              <Card title="ملاحظات الزبون">
                <p className="whitespace-pre-line text-[13px]">{o.notes}</p>
              </Card>
            )}

            <Card title="الزبون">
              <div className="space-y-1 text-[13px]">
                {customer ? (
                  <Link
                    href={`/dashboard/customers/${customer.id}`}
                    className="font-semibold text-[#005bd3] hover:underline"
                  >
                    {o.customer_name}
                  </Link>
                ) : (
                  <div className="font-semibold">{o.customer_name}</div>
                )}
                {customer && (
                  <div className="text-muted">{customer.orders_count} طلب</div>
                )}
                <div className="pt-2 font-semibold">التواصل</div>
                <div dir="ltr" className="text-right">
                  {o.phone}
                </div>
                <div className="flex gap-2 pt-1">
                  <a
                    href={whatsappLink(
                      normalizeWhatsapp(o.phone),
                      `مرحبا ${o.customer_name}، معك ${store.name} بخصوص طلبك رقم #${o.number}`,
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn !bg-[#25D366]"
                  >
                    واتساب
                  </a>
                  <a href={`tel:${o.phone}`} className="btn btn-outline">
                    اتصال
                  </a>
                </div>
                {o.fulfillment === "pickup" ? (
                  <div className="pt-3 font-semibold">🏪 استلام من المحل</div>
                ) : (
                  <>
                    <div className="pt-3 font-semibold">🚚 عنوان التوصيل</div>
                    <div>{o.city}</div>
                    <div className="text-muted">{o.address}</div>
                  </>
                )}
              </div>
            </Card>

            <Card title="ملاحظة داخلية">
              <form action={saveMerchantNote} className="space-y-2">
                <input type="hidden" name="id" value={o.id} />
                <textarea
                  name="note"
                  rows={3}
                  defaultValue={o.merchant_note ?? ""}
                  className="input"
                  placeholder="ما بيشوفها الزبون"
                />
                <button className="btn btn-outline">احفظ</button>
              </form>
            </Card>

            {!cancelled && (
              <Card title="خيارات أخرى">
                <div className="space-y-3 text-[13px]">
                  <StatusSelect id={o.id} />
                  <details>
                    <summary className="cursor-pointer font-semibold text-red-700">
                      إلغاء الطلب
                    </summary>
                    <form action={cancelOrder} className="mt-2 space-y-2">
                      <input type="hidden" name="id" value={o.id} />
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          name="restock"
                          defaultChecked
                          className="h-4 w-4 accent-black"
                        />
                        رجّع الكميات للمخزون
                      </label>
                      <button className="btn !bg-[#c70a24]">ألغِ الطلب</button>
                    </form>
                  </details>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </LiveOrder>
  );
}
