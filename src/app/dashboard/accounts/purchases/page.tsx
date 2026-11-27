import Link from "next/link";
import { Card, PageHeader } from "@/components/admin-ui";
import { ProGate } from "@/components/pro-gate";
import { dayLabel, monthBounds, monthKey, PAID_FROM } from "@/lib/accounts";
import { requireOwner } from "@/lib/auth";
import { formatPrice } from "@/lib/format";
import { isPro } from "@/lib/plans";
import { supabaseAdmin } from "@/lib/supabase";
import { AccountsTabs, MonthNav, Need018 } from "../ui";

type Line = { title: string; qty: number; cost: number; productId: string | null; variantTitle?: string | null };

export default async function PurchasesPage({ searchParams }: { searchParams: Promise<{ m?: string; open?: string; saved?: string }> }) {
  const { store } = await requireOwner();
  const sp = await searchParams;
  const header = (
    <>
      <PageHeader title="الحسابات" actions={isPro(store) ? <Link href="/dashboard/accounts/purchases/new" className="btn">فاتورة شراء جديدة</Link> : null} />
      <AccountsTabs active="/dashboard/accounts/purchases" />
    </>
  );
  if (!isPro(store)) return (<div>{header}<ProGate feature="الموردون والمشتريات" /></div>);

  const month = monthKey(sp.m);
  const b = monthBounds(month);
  const db = supabaseAdmin();
  const [{ data, error }, { data: sups }] = await Promise.all([
    db.from("purchases").select("*").eq("store_id", store.id).gte("day", b.first).lt("day", b.nextFirst).order("day", { ascending: false }).order("created_at", { ascending: false }).limit(1000),
    db.from("suppliers").select("id, name").eq("store_id", store.id),
  ]);
  if (error) return (<div>{header}<Need018 /></div>);
  const names = new Map((sups ?? []).map((s) => [s.id as string, s.name as string]));
  const money = (n: number) => formatPrice(Math.round(n * 100) / 100, store.currency);
  const total = (data ?? []).reduce((s, p) => s + Number(p.total), 0);

  return (
    <div className="space-y-4">
      {header}
      {sp.saved && (
        <p className="rounded-lg bg-green-50 p-3 text-[13px] text-green-800">✓ حُفظت فاتورة الشراء، وزادت كميات المنتجات المرتبطة وحُدّثت أسعار تكلفتها.</p>
      )}
      <Card title="فواتير الشراء" action={<MonthNav month={month} path="/dashboard/accounts/purchases" />}>
        <p className="mb-3 text-[13px] text-muted">
          مجموع مشتريات الشهر: <b dir="ltr">{money(total)}</b>. المشتريات بضاعة في المخزون، لذلك لا تُطرح من الربح مباشرة: يُحسب منها سعر التكلفة عند بيع كل قطعة.
        </p>
        {(data ?? []).length === 0 ? (
          <p className="text-[13px] text-muted">لا فواتير شراء في هذا الشهر.</p>
        ) : (
          <ul className="divide-y divide-black/5 text-[13px]">
            {(data ?? []).map((p) => {
              const items = (p.items as Line[]) ?? [];
              const due = Number(p.total) - Number(p.paid);
              return (
                <li key={p.id}>
                  <details open={sp.open === p.id} className="py-2.5">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-2">
                      <span>
                        <span className="font-semibold">{p.supplier_id ? names.get(p.supplier_id) ?? "مورد" : "دون مورد"}</span>
                        {p.ref && <span className="text-muted"> · رقم {p.ref}</span>}
                        <span className="block text-xs text-muted">
                          {dayLabel(p.day)} · {items.length} صنف
                        </span>
                      </span>
                      <span className="text-left">
                        <span className="font-semibold" dir="ltr">{money(Number(p.total))}</span>
                        <span className={`block text-xs ${due > 0.009 ? "text-red-700" : "text-[#1a7f37]"}`}>
                          {due > 0.009 ? `متبقٍ ${money(due)}` : `مدفوعة (${PAID_FROM[p.paid_from] ?? ""})`}
                        </span>
                      </span>
                    </summary>
                    <ul className="mt-2 space-y-1 rounded-lg bg-[#f7f7f7] p-3">
                      {items.map((l, i) => (
                        <li key={i} className="flex justify-between gap-2">
                          <span className="min-w-0 truncate">
                            {l.title}
                            {l.variantTitle ? ` (${l.variantTitle})` : ""}
                            {!l.productId && <span className="text-xs text-muted"> · غير مرتبط بمنتج</span>}
                          </span>
                          <span className="shrink-0" dir="ltr">
                            {l.qty} × {money(l.cost)}
                          </span>
                        </li>
                      ))}
                      {p.note && <li className="pt-1 text-xs text-muted">{p.note}</li>}
                    </ul>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
