import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/admin-ui";
import { ProGate } from "@/components/pro-gate";
import { requireAccess } from "@/lib/auth";
import { formatPrice } from "@/lib/format";
import { isPro } from "@/lib/plans";
import type { Quote } from "@/lib/types";
import { STATUS } from "./status";

export default async function QuotesPage() {
  const { store, db } = await requireAccess("quotes");
  if (!isPro(store))
    return (
      <div className="space-y-4">
        <PageHeader title="عروض الأسعار" />
        <ProGate feature="عروض الأسعار PDF" />
      </div>
    );
  const { data } = await db
    .from("quotes")
    .select("*")
    .eq("store_id", store.id)
    .order("created_at", { ascending: false })
    .limit(200);
  const quotes = (data ?? []) as Quote[];
  const date = new Intl.DateTimeFormat("ar-SY", {
    dateStyle: "medium",
    timeZone: "Asia/Damascus",
  });
  return (
    <div>
      <PageHeader
        title="عروض الأسعار"
        actions={
          <Link href="/dashboard/quotes/new" className="btn">
            عرض سعر جديد
          </Link>
        }
      />
      {quotes.length === 0 ? (
        <EmptyState
          title="ابعت لزبونك عرض سعر"
          text="لما حدا يسألك عن سعر لكمية كبيرة أو لمجموعة منتجات، اعمله عرض سعر بأسعار خاصة وابعتله ياه PDF عالواتساب."
          action={
            <Link href="/dashboard/quotes/new" className="btn">
              عرض سعر جديد
            </Link>
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="bg-[#f7f7f7] text-right text-xs text-muted">
              <tr>
                <th className="p-2 font-medium">العرض</th>
                <th className="p-2 font-medium">التاريخ</th>
                <th className="p-2 font-medium">الزبون</th>
                <th className="p-2 font-medium">المجموع</th>
                <th className="p-2 font-medium">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {quotes.map((q) => (
                <tr key={q.id} className="hover:bg-[#f7f7f7]">
                  <td className="p-2 font-semibold">
                    <Link
                      href={`/dashboard/quotes/${q.id}`}
                      className="hover:underline"
                    >
                      #{q.number}
                    </Link>
                  </td>
                  <td className="p-2 text-muted">
                    {date.format(new Date(q.created_at))}
                  </td>
                  <td className="p-2">{q.customer_name}</td>
                  <td className="p-2">
                    {formatPrice(Number(q.total), store.currency)}
                  </td>
                  <td className="p-2">
                    <span className={`badge ${STATUS[q.status].className}`}>
                      ● {STATUS[q.status].label}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
