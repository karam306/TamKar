import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, PageHeader } from "@/components/admin-ui";
import { requireAccess } from "@/lib/auth";
import { formatPrice, whatsappLink } from "@/lib/format";
import { money as fxMoney } from "@/lib/fx";
import { supabaseAdmin } from "@/lib/supabase";
import type { OrderPayment } from "@/lib/debts";
import { CreditCard } from "@/app/dashboard/debts/credit-card";
import { normalizeWhatsapp } from "@/lib/templates";
import type { Order, OrderReturn } from "@/lib/types";

const o_refunded = (d: unknown) =>
  (d as { refunded?: number | null } | null)?.refunded ?? 0;
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
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returned?: string }>;
}) {
  const { returned } = await searchParams;
  const { store, db } = await requireAccess("orders");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [{ data }, { data: events }, { data: returnRows }] = await Promise.all([
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
    // Empty until update 011 is run.
    db
      .from("order_returns")
      .select("*")
      .eq("order_id", id)
      .eq("store_id", store.id)
      .order("created_at"),
  ]);
  const returns = (returnRows ?? []) as OrderReturn[];
  // Debt ledger payments; null until update 013 is run.
  const { data: payRows, error: payErr } = await supabaseAdmin()
    .from("order_payments")
    .select("id, order_id, amount, note, created_at")
    .eq("order_id", id)
    .eq("store_id", store.id)
    .order("created_at");
  const payments = payErr ? null : ((payRows ?? []) as OrderPayment[]);
  const refunded = Number(o_refunded(data));
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
    <LiveOrder
      status={o.status}
      payment={o.payment_status}
      pickup={o.fulfillment === "pickup"}
    >
      <div>
        <PageHeader
          back="/dashboard/orders"
          title={`#${o.number}`}
          badges={
            <>
              <LivePaymentBadge method={o.payment_method} />
              <LiveStatusBadge />
            </>
          }
          actions={
            <>
              {o.status !== "cancelled" && (
                <Link
                  href={`/dashboard/orders/${o.id}/return`}
                  className="btn btn-outline"
                >
                  ↩ استرجاع أو تبديل
                </Link>
              )}
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
        {returned && (
          <p className="mb-4 rounded-lg bg-green-50 p-3 text-[13px] font-semibold text-green-800">
            ✓ تم التسجيل، وحُدِّث المخزون والحساب.
          </p>
        )}
        <p className="-mt-3 mb-5 text-[13px] text-muted">
          {fmt.format(new Date(o.created_at))} ·{" "}
          {o.in_store ? "بيع في المحل" : o.source === "manual" ? "طلب يدوي" : "من المتجر الإلكتروني"}
        </p>

        {o.wa_status === "pending" && o.status === "new" && (
          <div className="card mb-4 border-r-4 border-[#e8a33c] p-4 text-[13px]">
            <p className="mb-1 font-semibold">لم يرسل الزبون الطلب عبر واتساب بعد.</p>
            <p className="mb-3 text-muted">
              قد يكون أغلق الصفحة قبل الإرسال. أرسل إليه رسالة تأكيد قبل تجهيز الطلب، ثم غيّر حالته إلى «مؤكد» عندما يرد.
            </p>
            <a
              href={whatsappLink(
                normalizeWhatsapp(o.phone),
                [
                  `مرحباً ${o.customer_name}،`,
                  `وصلنا طلبك رقم #${o.number} من ${store.name}:`,
                  ...o.items.map((i) => `• ${i.title}${i.variantTitle ? ` (${i.variantTitle})` : ""} × ${i.qty}`),
                  `المجموع: ${money(Number(o.total))}`,
                  "",
                  "هل تؤكد الطلب؟ يكفي أن ترد بكلمة «نعم».",
                ].join("\n"),
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="btn inline-flex"
            >
              إرسال رسالة تأكيد للزبون
            </a>
          </div>
        )}

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
                      {i.offer ? <span className="text-green-700"> · عرض الكمية {i.offer}٪</span> : null}
                    </span>
                    <span className="w-20 text-left font-semibold">
                      {money(i.price * i.qty)}
                    </span>
                  </li>
                ))}
              </ul>
              <NextStepButton id={o.id} />
            </Card>

            <Card title={<LivePaymentBadge method={o.payment_method} />}>
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
                {o.fx && (
                  <div className="flex justify-between text-[13px] text-muted">
                    <span>بالليرة، بسعر {o.fx.rate}</span>
                    <span>
                      {fxMoney(store.currency, o.fx).text(
                        fxMoney(store.currency, o.fx).totals(o.items, Number(o.discount_amount ?? 0), o.fulfillment !== "pickup" ? Number(o.shipping_fee ?? 0) : 0).total,
                      )}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>
                    <LivePaidLabel />
                  </span>
                  <span>{money(Number(o.total))}</span>
                </div>
                {returns.some((r) => Number(r.extra_charge) > 0) && (
                  <div className="flex justify-between">
                    <span>مبلغ إضافي (تبديل)</span>
                    <span>
                      +
                      {money(
                        returns.reduce((t, r) => t + Number(r.extra_charge), 0),
                      )}
                    </span>
                  </div>
                )}
                {refunded > 0 && (
                  <>
                    <div className="flex justify-between text-[#8e1f0b]">
                      <span>المبلغ المُعاد للزبون</span>
                      <span>-{money(refunded)}</span>
                    </div>
                    <div className="flex justify-between border-t border-black/5 pt-2 font-semibold">
                      <span>الصافي</span>
                      <span>
                        {money(
                          Number(o.total) +
                            returns.reduce(
                              (t, r) => t + Number(r.extra_charge),
                              0,
                            ) -
                            refunded,
                        )}
                      </span>
                    </div>
                  </>
                )}
              </div>
              <PaidButton id={o.id} />
            </Card>

            <CreditCard order={o} payments={payments} money={money} />

            {returns.length > 0 && (
              <Card title="↩ المرتجعات والتبديل">
                <ul className="divide-y divide-black/5 text-[13px]">
                  {returns.map((r) => (
                    <li key={r.id} className="space-y-1 py-2.5">
                      <div className="flex justify-between">
                        <b>{r.kind === "exchange" ? "تبديل" : "استرجاع"}</b>
                        <span className="text-muted">
                          {fmt.format(new Date(r.created_at))}
                        </span>
                      </div>
                      {r.items.length > 0 && (
                        <div>
                          <span className="text-muted">المُرتجَع: </span>
                          {r.items
                            .map(
                              (i) =>
                                `${i.title}${i.variantTitle ? ` (${i.variantTitle})` : ""} × ${i.qty}`,
                            )
                            .join("، ")}
                          {r.restocked ? (
                            <span className="text-muted"> · أُعيد إلى المخزون</span>
                          ) : (
                            <span className="text-muted">
                              {" "}
                              · لم يُعَد إلى المخزون
                            </span>
                          )}
                        </div>
                      )}
                      {r.new_items.length > 0 && (
                        <div>
                          <span className="text-muted">البديل: </span>
                          {r.new_items
                            .map(
                              (i) =>
                                `${i.title}${i.variantTitle ? ` (${i.variantTitle})` : ""} × ${i.qty}`,
                            )
                            .join("، ")}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-x-4">
                        {Number(r.refund_amount) > 0 && (
                          <span className="text-[#8e1f0b]">
                            أُعيد {money(Number(r.refund_amount))}
                          </span>
                        )}
                        {Number(r.extra_charge) > 0 && (
                          <span>مبلغ إضافي {money(Number(r.extra_charge))}</span>
                        )}
                        {r.method && (
                          <span className="text-muted">{r.method}</span>
                        )}
                      </div>
                      {r.reason && (
                        <div className="text-muted">السبب: {r.reason}</div>
                      )}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            <Card title="السجل">
              <form action={addComment} className="mb-4 flex gap-2">
                <input type="hidden" name="id" value={o.id} />
                <input
                  name="message"
                  placeholder="أضف ملاحظة إلى السجل..."
                  className="input"
                  maxLength={1000}
                />
                <button className="btn btn-outline">إضافة</button>
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
            {o.gift && (
              <Card title="🎁 هدية">
                <div className="space-y-1 text-[13px]">
                  <div>
                    <span className="text-muted">المستلم: </span>
                    <b>{o.gift.to_name}</b>
                  </div>
                  {o.gift.to_phone && (
                    <div>
                      <span className="text-muted">رقم الهاتف: </span>
                      <a
                        href={`tel:${o.gift.to_phone}`}
                        dir="ltr"
                        className="text-[#005bd3] hover:underline"
                      >
                        {o.gift.to_phone}
                      </a>
                    </div>
                  )}
                  {o.gift.message && (
                    <div className="mt-2 rounded-lg bg-[#fff8e6] p-2">
                      <div className="text-[11px] text-muted">رسالة البطاقة</div>
                      <p className="whitespace-pre-line">{o.gift.message}</p>
                    </div>
                  )}
                  {o.gift.hide_prices && (
                    <p className="mt-2 font-semibold text-[#8a6116]">
                      ⚠️ لا تُرفق فاتورة أو أسعاراً مع الهدية
                    </p>
                  )}
                </div>
              </Card>
            )}
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
                      `مرحباً ${o.customer_name}، معك ${store.name} بخصوص طلبك رقم #${o.number}`,
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
                  <div className="pt-3 font-semibold">
                    🏪 الاستلام من {o.branch || "المحل"}
                  </div>
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
                  placeholder="لا يراها الزبون"
                />
                <button className="btn btn-outline">حفظ</button>
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
                        إعادة الكميات إلى المخزون
                      </label>
                      <button className="btn !bg-[#c70a24]">إلغاء الطلب</button>
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
