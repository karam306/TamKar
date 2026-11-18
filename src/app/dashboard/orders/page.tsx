import Link from "next/link";
import { requireMerchant } from "@/lib/auth";
import { formatPrice, whatsappLink } from "@/lib/format";
import { normalizeWhatsapp } from "@/lib/templates";
import type { Order } from "@/lib/types";
import { setOrderStatus } from "./actions";
import { ORDER_STATUSES, StatusBadge } from "./status";

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { store, db } = await requireMerchant();
  const { status } = await searchParams;

  let q = db.from("orders").select("*").eq("store_id", store.id).order("created_at", { ascending: false }).limit(200);
  if (status && ORDER_STATUSES.some((s) => s.id === status)) q = q.eq("status", status);
  const orders = ((await q).data ?? []) as Order[];
  const date = new Intl.DateTimeFormat("ar-SY", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Damascus" });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl">الطلبات</h1>
      <div className="flex flex-wrap gap-2 text-sm">
        <Link href="/dashboard/orders" className={`rounded-full px-4 py-1.5 ${!status ? "bg-primary text-white" : "bg-white"}`}>
          الكل
        </Link>
        {ORDER_STATUSES.map((s) => (
          <Link key={s.id} href={`/dashboard/orders?status=${s.id}`} className={`rounded-full px-4 py-1.5 ${status === s.id ? "bg-primary text-white" : "bg-white"}`}>
            {s.label}
          </Link>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="rounded-theme bg-white p-10 text-center text-muted">ما في طلبات هون.</div>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={o.id} id={`o-${o.number}`} className="rounded-theme bg-white p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold">#{o.number}</span>
                  <StatusBadge status={o.status} />
                </div>
                <span className="text-xs text-muted">{date.format(new Date(o.created_at))}</span>
              </div>

              <div className="grid gap-4 text-sm sm:grid-cols-2">
                <div className="space-y-1">
                  <div className="font-semibold">{o.customer_name}</div>
                  <div dir="ltr" className="text-right">{o.phone}</div>
                  <div className="text-muted">
                    {o.city}، {o.address}
                  </div>
                  {o.notes && <div className="rounded-theme bg-amber-50 p-2">📝 {o.notes}</div>}
                </div>
                <div>
                  <ul className="space-y-1">
                    {o.items.map((i, idx) => (
                      <li key={idx} className="flex justify-between gap-2">
                        <span>
                          {i.title} × {i.qty}
                        </span>
                        <span>{formatPrice(i.price * i.qty, store.currency)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-2 flex justify-between border-t border-black/5 pt-2 font-semibold">
                    <span>المجموع</span>
                    <span>{formatPrice(Number(o.total), store.currency)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-black/5 pt-4">
                <a
                  href={whatsappLink(normalizeWhatsapp(o.phone), `مرحبا ${o.customer_name}، معك ${store.name} بخصوص طلبك رقم #${o.number}`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn !bg-[#25D366] !py-1.5 text-sm"
                >
                  راسل الزبون
                </a>
                <a href={`tel:${o.phone}`} className="btn btn-outline !py-1.5 text-sm">
                  اتصل
                </a>
                <div className="mr-auto flex flex-wrap gap-1">
                  {ORDER_STATUSES.filter((s) => s.id !== o.status).map((s) => (
                    <form key={s.id} action={setOrderStatus}>
                      <input type="hidden" name="id" value={o.id} />
                      <input type="hidden" name="status" value={s.id} />
                      <button type="submit" className="rounded-full border border-black/10 px-3 py-1 text-xs hover:border-primary">
                        {s.label}
                      </button>
                    </form>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
