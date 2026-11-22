import Link from "next/link";
import { EmptyState, PageHeader, Pager } from "@/components/admin-ui";
import { requireMerchant } from "@/lib/auth";
import { formatPrice } from "@/lib/format";
import type { Order } from "@/lib/types";
import { ORDER_STATUSES, PaymentBadge, StatusBadge } from "./status";

const PER_PAGE = 50;
type SP = { status?: string; q?: string; page?: string };

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const { store, db } = await requireMerchant();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  let q = db
    .from("orders")
    .select("*", { count: "exact" })
    .eq("store_id", store.id);
  if (sp.status && ORDER_STATUSES.some((s) => s.id === sp.status))
    q = q.eq("status", sp.status);
  if (sp.q) {
    const term = sp.q.replace(/[%_,()#]/g, "").trim();
    q =
      /^\d+$/.test(term) && term.length <= 7
        ? q.or(`number.eq.${term},phone.ilike.%${term}%`)
        : q.or(`customer_name.ilike.%${term}%,phone.ilike.%${term}%`);
  }
  const { data, count } = await q
    .order("created_at", { ascending: false })
    .range((page - 1) * PER_PAGE, page * PER_PAGE - 1);
  const orders = (data ?? []) as Order[];
  const pages = Math.ceil((count ?? 0) / PER_PAGE);
  const link = (patch: Partial<SP>) => {
    const p = new URLSearchParams(
      Object.entries({ ...sp, page: undefined, ...patch }).filter(
        ([, v]) => v,
      ) as [string, string][],
    );
    return `/dashboard/orders${p.size ? `?${p}` : ""}`;
  };
  const date = new Intl.DateTimeFormat("ar-SY", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Damascus",
  });

  return (
    <div>
      <PageHeader
        title="الطلبات"
        actions={
          <>
            <a
              href={`/api/export/orders${sp.status ? `?status=${sp.status}` : ""}`}
              className="btn btn-outline"
            >
              تصدير
            </a>
            <Link href="/dashboard/orders/new" className="btn">
              طلب يدوي
            </Link>
          </>
        }
      />
      {!sp.q && !sp.status && orders.length === 0 ? (
        <EmptyState
          title="طلباتك رح تظهر هون"
          text="أول ما يطلب حدا من متجرك رح يوصلك الطلب هون. وإذا إجاك طلب على الهاتف أو واتساب، فيك تسجله يدوياً."
          action={
            <Link href="/dashboard/orders/new" className="btn">
              أنشئ طلب يدوي
            </Link>
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="flex flex-wrap items-center gap-1 border-b border-black/5 p-2">
            <Link
              href={link({ status: undefined })}
              className={`rounded-lg px-3 py-1 ${!sp.status ? "bg-black/5 font-semibold" : "text-muted hover:bg-black/5"}`}
            >
              الكل
            </Link>
            {ORDER_STATUSES.map((s) => (
              <Link
                key={s.id}
                href={link({ status: s.id })}
                className={`rounded-lg px-3 py-1 ${sp.status === s.id ? "bg-black/5 font-semibold" : "text-muted hover:bg-black/5"}`}
              >
                {s.label}
              </Link>
            ))}
            <form className="mr-auto">
              {sp.status && (
                <input type="hidden" name="status" value={sp.status} />
              )}
              <input
                name="q"
                defaultValue={sp.q}
                placeholder="رقم الطلب، الاسم أو الهاتف"
                className="input !py-1 w-56"
              />
            </form>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-[#f7f7f7] text-right text-xs text-muted">
                <tr>
                  <th className="p-2 font-medium">الطلب</th>
                  <th className="p-2 font-medium">التاريخ</th>
                  <th className="p-2 font-medium">الزبون</th>
                  <th className="p-2 font-medium">المجموع</th>
                  <th className="hidden p-2 font-medium md:table-cell">
                    الدفع
                  </th>
                  <th className="p-2 font-medium">الحالة</th>
                  <th className="hidden p-2 font-medium sm:table-cell">
                    القطع
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {orders.map((o) => (
                  <tr key={o.id} className="relative hover:bg-[#f7f7f7]">
                    <td className="p-2 font-semibold">
                      <Link
                        href={`/dashboard/orders/${o.id}`}
                        className="after:absolute after:inset-0"
                      >
                        #{o.number}
                      </Link>
                      {o.source === "manual" && (
                        <span className="mr-1 text-[11px] font-normal text-muted">
                          يدوي
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap p-2 text-muted">
                      {date.format(new Date(o.created_at))}
                    </td>
                    <td className="p-2">
                      {o.customer_name}
                      <span
                        className="mr-1 text-xs text-muted"
                        title={
                          o.fulfillment === "pickup"
                            ? "استلام من المحل"
                            : "توصيل"
                        }
                      >
                        {o.fulfillment === "pickup" ? "🏪" : "🚚"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap p-2">
                      {formatPrice(Number(o.total), store.currency)}
                    </td>
                    <td className="hidden p-2 md:table-cell">
                      <PaymentBadge status={o.payment_status} method={o.payment_method} />
                    </td>
                    <td className="p-2">
                      <StatusBadge status={o.status} pickup={o.fulfillment === "pickup"} />
                    </td>
                    <td className="hidden p-2 text-muted sm:table-cell">
                      {o.items.reduce((s, i) => s + i.qty, 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {orders.length === 0 && (
            <p className="p-10 text-center text-muted">ما في طلبات مطابقة</p>
          )}
          <Pager
            page={page}
            pages={pages}
            href={(n) => link({ page: String(n) })}
          />
        </div>
      )}
    </div>
  );
}
