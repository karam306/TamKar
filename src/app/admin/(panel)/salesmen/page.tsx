import { headers } from "next/headers";
import Link from "next/link";
import { Card, PageHeader } from "@/components/admin-ui";
import { loadSalesmen, loadStores } from "@/app/admin/data";
import { toggleSalesman } from "@/app/admin/platform-actions";
import { subState } from "@/lib/subscription";
import { AddSalesmanForm, CopyRef } from "./forms";

export const dynamic = "force-dynamic";

export default async function SalesmenPage() {
  const [salesmen, stores] = await Promise.all([loadSalesmen(), loadStores()]);
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") || "https"}://${h.get("x-forwarded-host") || h.get("host")}`;
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const heard = new Map<string, number>();
  for (const s of stores) if (s.heard_from) heard.set(s.heard_from.split(":")[0], (heard.get(s.heard_from.split(":")[0]) ?? 0) + 1);

  return (
    <div className="space-y-4">
      <PageHeader title="المندوبون" />
      <Card title="إضافة مندوب">
        <AddSalesmanForm />
      </Card>

      {salesmen.length === 0 ? (
        <Card>
          <p className="py-6 text-center text-[13px] text-muted">لا يوجد مندوبون بعد. أضف أول مندوب من الأعلى.</p>
        </Card>
      ) : (
        salesmen.map((m) => {
          const mine = stores.filter((s) => s.salesman_id === m.id);
          const thisMonth = mine.filter((s) => new Date(s.created_at) >= monthStart);
          const paying = mine.filter((s) => ["active", "expiring"].includes(subState(s)) && s.plan !== "trial");
          const link = `${origin}/signup?ref=${m.code}`;
          return (
            <Card
              key={m.id}
              title={
                <span>
                  {m.name} <span className="badge mr-1 font-mono">{m.code}</span>
                  {!m.active && <span className="badge mr-1 bg-[#e3e3e3]">موقوف</span>}
                </span>
              }
              action={
                <form action={toggleSalesman}>
                  <input type="hidden" name="id" value={m.id} />
                  <input type="hidden" name="active" value={m.active ? "0" : "1"} />
                  <button className="text-[13px] text-muted hover:underline">{m.active ? "إيقاف" : "تفعيل"}</button>
                </form>
              }
            >
              <div className="mb-3 grid grid-cols-3 gap-2 text-center">
                <Num label="كل المتاجر" value={mine.length} />
                <Num label="هذا الشهر" value={thisMonth.length} />
                <Num label="تدفع حالياً" value={paying.length} />
              </div>
              <CopyRef link={link} phone={m.phone} />
              {mine.length > 0 && (
                <ul className="mt-3 divide-y divide-black/5 text-[13px]">
                  {mine.map((s) => (
                    <li key={s.id} className="flex justify-between gap-2 py-2">
                      <Link href={`/admin/stores/${s.id}`} className="font-semibold hover:underline">
                        {s.name}
                      </Link>
                      <span className="text-muted">{new Date(s.created_at).toLocaleDateString("en-GB")}</span>
                      <span>{s.plan === "trial" ? "تجريبي" : paying.includes(s) ? "✓ يدفع" : "متوقف"}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          );
        })
      )}

      {heard.size > 0 && (
        <Card title="كيف عرفوا بنا">
          <ul className="space-y-1 text-[13px]">
            {[...heard.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([k, n]) => (
                <li key={k} className="flex justify-between">
                  <span>{k}</span>
                  <b>{n}</b>
                </li>
              ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function Num({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-[#f7f7f7] p-2">
      <div className="text-lg font-bold">{value}</div>
      <div className="text-[11px] text-muted">{label}</div>
    </div>
  );
}
