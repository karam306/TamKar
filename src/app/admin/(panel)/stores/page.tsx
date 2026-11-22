import Link from "next/link";
import { PageHeader } from "@/components/admin-ui";
import { businessLabel } from "@/lib/business-types";
import { formatPrice } from "@/lib/format";
import { PLAN_LABELS } from "@/lib/plans";
import { daysLeft, SUB_LABELS, subState, type SubState } from "@/lib/subscription";
import { loadStores } from "@/app/admin/data";

const FILTERS: { id: string; label: string; states: SubState[] }[] = [
  { id: "paid", label: "مدفوعة", states: ["active", "expiring"] },
  { id: "trial", label: "تجريبية", states: ["trial"] },
  { id: "attention", label: "بحاجة إلى متابعة", states: ["expiring", "grace", "expired"] },
  { id: "off", label: "موقوفة", states: ["suspended"] },
];

export default async function AdminStores({ searchParams }: { searchParams: Promise<{ q?: string; f?: string }> }) {
  const { q, f } = await searchParams;
  const filter = FILTERS.find((x) => x.id === f);
  const term = (q ?? "").trim().toLowerCase();
  const stores = (await loadStores()).filter((s) => {
    if (filter && !filter.states.includes(subState(s))) return false;
    if (!term) return true;
    return [s.name, s.slug, s.email, s.owner_name, s.owner_phone, s.whatsapp].some((v) => v?.toLowerCase().includes(term));
  });

  return (
    <div>
      <PageHeader
        title={`المتاجر (${stores.length})`}
        actions={
          <Link href="/admin/stores/new" className="btn">
            متجر جديد
          </Link>
        }
      />
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-1 border-b border-black/5 p-2">
          <Link href="/admin/stores" className={`rounded-lg px-3 py-1 ${!filter ? "bg-black/5 font-semibold" : "text-muted hover:bg-black/5"}`}>
            الكل
          </Link>
          {FILTERS.map((x) => (
            <Link key={x.id} href={`/admin/stores?f=${x.id}`} className={`rounded-lg px-3 py-1 ${f === x.id ? "bg-black/5 font-semibold" : "text-muted hover:bg-black/5"}`}>
              {x.label}
            </Link>
          ))}
          <form className="mr-auto">
            {f && <input type="hidden" name="f" value={f} />}
            <input name="q" defaultValue={q} placeholder="اسم، رابط، بريد إلكتروني أو رقم" className="input !py-1 w-56" />
          </form>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-[#f7f7f7] text-right text-xs text-muted">
              <tr>
                <th className="p-2 font-medium">المتجر</th>
                <th className="hidden p-2 font-medium md:table-cell">النوع</th>
                <th className="p-2 font-medium">الاشتراك</th>
                <th className="hidden p-2 font-medium sm:table-cell">حتى</th>
                <th className="p-2 font-medium">طلبات 30 يوم</th>
                <th className="hidden p-2 font-medium lg:table-cell">مبيعات 30 يوم</th>
                <th className="hidden p-2 font-medium lg:table-cell">المنتجات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {stores.map((s) => {
                const st = subState(s);
                const left = daysLeft(s.paid_until);
                return (
                  <tr key={s.id} className="relative hover:bg-[#f7f7f7]">
                    <td className="p-2">
                      <Link href={`/admin/stores/${s.id}`} className="font-semibold after:absolute after:inset-0">
                        {s.name}
                      </Link>
                      <div className="text-xs text-muted" dir="ltr" style={{ textAlign: "right" }}>
                        {s.email}
                      </div>
                    </td>
                    <td className="hidden p-2 text-muted md:table-cell">{businessLabel(s.business_type)}</td>
                    <td className="p-2">
                      <span className={`badge ${SUB_LABELS[st].className}`}>{SUB_LABELS[st].label}</span>
                      {s.plan !== "trial" && (
                        <span className={`badge mr-1 ${s.plan === "pro" ? "!bg-[#0b2b26] !text-white" : ""}`}>{PLAN_LABELS[s.plan] ?? s.plan}</span>
                      )}
                    </td>
                    <td className="hidden whitespace-nowrap p-2 text-muted sm:table-cell">
                      {s.paid_until ?? "دون تاريخ"}
                      {left != null && left >= 0 && left <= 30 && <span> ({left} يوم)</span>}
                    </td>
                    <td className="p-2">{s.orders30}</td>
                    <td className="hidden p-2 lg:table-cell">{formatPrice(s.sales30, s.currency)}</td>
                    <td className="hidden p-2 lg:table-cell">{s.products}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {stores.length === 0 && <p className="p-10 text-center text-muted">لا توجد متاجر</p>}
      </div>
    </div>
  );
}
