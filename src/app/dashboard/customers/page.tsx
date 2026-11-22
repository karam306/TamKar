import Link from "next/link";
import { EmptyState, PageHeader, Pager } from "@/components/admin-ui";
import { requireAccess } from "@/lib/auth";
import { formatPrice } from "@/lib/format";
import type { Customer } from "@/lib/types";

const PER_PAGE = 50;

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { store, db } = await requireAccess("customers");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  let q = db
    .from("customers")
    .select("*", { count: "exact" })
    .eq("store_id", store.id);
  if (sp.q) {
    const t = sp.q.replace(/[%_,()]/g, "");
    q = q.or(`name.ilike.%${t}%,phone.ilike.%${t}%,city.ilike.%${t}%`);
  }
  const { data, count } = await q
    .order("last_order_at", { ascending: false, nullsFirst: false })
    .range((page - 1) * PER_PAGE, page * PER_PAGE - 1);
  const customers = (data ?? []) as Customer[];
  const pages = Math.ceil((count ?? 0) / PER_PAGE);

  return (
    <div>
      <PageHeader title="الزبائن" />
      {!sp.q && customers.length === 0 ? (
        <EmptyState
          title="سيظهر زبائنك هنا"
          text="يُضاف هنا تلقائياً كل زبون يطلب من متجرك (أو تسجّله بطلب يدوي) مع جميع طلباته."
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-black/5 p-2">
            <span className="px-2 text-muted">{count ?? 0} زبون</span>
            <form className="mr-auto">
              <input
                name="q"
                defaultValue={sp.q}
                placeholder="ابحث بالاسم، الهاتف أو المدينة"
                className="input !py-1 w-60"
              />
            </form>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-[#f7f7f7] text-right text-xs text-muted">
                <tr>
                  <th className="p-2 font-medium">الاسم</th>
                  <th className="p-2 font-medium">الهاتف</th>
                  <th className="hidden p-2 font-medium sm:table-cell">
                    المدينة
                  </th>
                  <th className="p-2 font-medium">الطلبات</th>
                  <th className="p-2 font-medium">مجموع المشتريات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {customers.map((c) => (
                  <tr key={c.id} className="relative hover:bg-[#f7f7f7]">
                    <td className="p-2 font-semibold">
                      <Link
                        href={`/dashboard/customers/${c.id}`}
                        className="after:absolute after:inset-0"
                      >
                        {c.name}
                      </Link>
                    </td>
                    <td
                      className="p-2"
                      dir="ltr"
                      style={{ textAlign: "right" }}
                    >
                      {c.phone}
                    </td>
                    <td className="hidden p-2 text-muted sm:table-cell">
                      {c.city}
                    </td>
                    <td className="p-2">{c.orders_count}</td>
                    <td className="p-2">
                      {formatPrice(Number(c.total_spent), store.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager
            page={page}
            pages={pages}
            href={(n) =>
              `/dashboard/customers?page=${n}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}`
            }
          />
        </div>
      )}
    </div>
  );
}
