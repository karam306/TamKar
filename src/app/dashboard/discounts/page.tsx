import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/admin-ui";
import { requireAccess } from "@/lib/auth";
import type { Discount } from "@/lib/types";
import { describeDiscount, discountState } from "./describe";

export default async function DiscountsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { store, db } = await requireAccess("discounts");
  const { saved } = await searchParams;
  const { data } = await db
    .from("discounts")
    .select("*")
    .eq("store_id", store.id)
    .order("created_at", { ascending: false });
  const list = (data ?? []) as Discount[];

  return (
    <div>
      <PageHeader
        title="الخصومات"
        actions={
          <Link href="/dashboard/discounts/new" className="btn">
            إنشاء خصم
          </Link>
        }
      />
      {saved && <p className="card mb-4 p-3 text-[13px]">✓ تم حفظ الخصم</p>}
      {list.length === 0 ? (
        <EmptyState
          title="أنشئ خصومات لزبائنك"
          text="رمز خصم يكتبه الزبون في السلة (مثل RAMADAN10)، أو خصم يُطبَّق تلقائياً، أو توصيل مجاني."
          action={
            <Link href="/dashboard/discounts/new" className="btn">
              إنشاء خصم
            </Link>
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="bg-[#f7f7f7] text-right text-xs text-muted">
              <tr>
                <th className="p-2 font-medium">الخصم</th>
                <th className="p-2 font-medium">الحالة</th>
                <th className="hidden p-2 font-medium sm:table-cell">النوع</th>
                <th className="p-2 font-medium">الاستخدام</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {list.map((d) => {
                const st = discountState(d);
                return (
                  <tr key={d.id} className="relative hover:bg-[#f7f7f7]">
                    <td className="p-2">
                      <Link
                        href={`/dashboard/discounts/${d.id}`}
                        className="font-semibold after:absolute after:inset-0"
                        dir={d.code ? "ltr" : undefined}
                      >
                        {d.code ?? d.title}
                      </Link>
                      <div className="text-xs text-muted">
                        {describeDiscount(d, store.currency)}
                      </div>
                    </td>
                    <td className="p-2">
                      <span className={`badge ${st.className}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="hidden p-2 text-muted sm:table-cell">
                      {d.automatic ? "تلقائي" : "رمز"}
                    </td>
                    <td className="p-2">
                      {d.used_count}
                      {d.usage_limit ? ` / ${d.usage_limit}` : ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
