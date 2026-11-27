import Link from "next/link";
import { Card, PageHeader } from "@/components/admin-ui";
import { ProGate } from "@/components/pro-gate";
import { supplierBalances } from "@/lib/accounts";
import { requireOwner } from "@/lib/auth";
import { formatPrice } from "@/lib/format";
import { isPro } from "@/lib/plans";
import { supabaseAdmin } from "@/lib/supabase";
import { AccountsTabs, Need018 } from "../ui";
import { SupplierForm } from "./forms";

export default async function SuppliersPage() {
  const { store } = await requireOwner();
  const header = (
    <>
      <PageHeader title="الحسابات" actions={isPro(store) ? <Link href="/dashboard/accounts/purchases/new" className="btn">فاتورة شراء جديدة</Link> : null} />
      <AccountsTabs active="/dashboard/accounts/suppliers" />
    </>
  );
  if (!isPro(store)) return (<div>{header}<ProGate feature="الموردون والمشتريات" /></div>);

  const { data, error } = await supabaseAdmin().from("suppliers").select("*").eq("store_id", store.id).order("name");
  if (error) return (<div>{header}<Need018 /></div>);
  const owed = await supplierBalances(store.id);
  const money = (n: number) => formatPrice(Math.round(n * 100) / 100, store.currency);
  const total = [...owed.values()].reduce((s, v) => s + Math.max(0, v), 0);

  return (
    <div className="space-y-4">
      {header}
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card title="الموردون" action={total > 0 ? <span className="text-[13px]">عليك للموردين: <b dir="ltr">{money(total)}</b></span> : null}>
          {(data ?? []).length === 0 ? (
            <p className="text-[13px] text-muted">أضف الموردين الذين تشتري منهم، ثم سجّل فواتير الشراء والدفعات لتعرف ما عليك لكل منهم.</p>
          ) : (
            <ul className="divide-y divide-black/5 text-[13px]">
              {(data ?? []).map((s) => {
                const o = owed.get(s.id) ?? 0;
                return (
                  <li key={s.id}>
                    <Link href={`/dashboard/accounts/suppliers/${s.id}`} className="flex items-center justify-between gap-2 py-2.5 hover:bg-black/[0.02]">
                      <span>
                        <span className="font-semibold">{s.name}</span>
                        {s.phone && <span className="block text-xs text-muted" dir="ltr" style={{ textAlign: "right" }}>{s.phone}</span>}
                      </span>
                      <span className={o > 0.009 ? "font-semibold text-red-700" : "text-muted"} dir="ltr">
                        {o > 0.009 ? money(o) : o < -0.009 ? `لك ${money(-o)}` : "لا شيء"}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
        <Card title="مورد جديد">
          <SupplierForm />
        </Card>
      </div>
    </div>
  );
}
