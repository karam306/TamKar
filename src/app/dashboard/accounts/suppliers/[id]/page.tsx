import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, PageHeader } from "@/components/admin-ui";
import { branchList, dayLabel, PAID_FROM, todayDamascus } from "@/lib/accounts";
import { requireOwner } from "@/lib/auth";
import { formatPrice, whatsappLink } from "@/lib/format";
import { isPro } from "@/lib/plans";
import { supabaseAdmin } from "@/lib/supabase";
import { deleteSupplierPayment } from "../../actions";
import { AccountsTabs } from "../../ui";
import { PayForm, SupplierForm } from "../forms";

/** A supplier's statement: invoices and payments, oldest first, with the running balance. */
export default async function SupplierPage({ params }: { params: Promise<{ id: string }> }) {
  const { store } = await requireOwner();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id) || !isPro(store)) notFound();
  const db = supabaseAdmin();
  const { data: s } = await db.from("suppliers").select("*").eq("id", id).eq("store_id", store.id).maybeSingle();
  if (!s) notFound();
  const [{ data: buys }, { data: pays }] = await Promise.all([
    db.from("purchases").select("id, day, ref, total, paid, paid_from, created_at").eq("supplier_id", id).eq("store_id", store.id),
    db.from("supplier_payments").select("id, day, amount, paid_from, note, created_at").eq("supplier_id", id).eq("store_id", store.id),
  ]);
  const money = (n: number) => formatPrice(Math.round(n * 100) / 100, store.currency);

  type Entry = { key: string; day: string; at: string; label: string; plus: number; minus: number; href?: string; payId?: string };
  const entries: Entry[] = [
    ...(buys ?? []).flatMap((b) => [
      { key: `b${b.id}`, day: b.day, at: b.created_at, label: `فاتورة شراء${b.ref ? ` رقم ${b.ref}` : ""}`, plus: Number(b.total), minus: 0, href: `/dashboard/accounts/purchases?open=${b.id}` },
      ...(Number(b.paid) > 0
        ? [{ key: `bp${b.id}`, day: b.day, at: b.created_at, label: `دُفع مع الفاتورة (${PAID_FROM[b.paid_from] ?? ""})`, plus: 0, minus: Number(b.paid) }]
        : []),
    ]),
    ...(pays ?? []).map((p) => ({
      key: `p${p.id}`,
      day: p.day,
      at: p.created_at,
      label: `دفعة (${PAID_FROM[p.paid_from] ?? ""})${p.note ? ` · ${p.note}` : ""}`,
      plus: 0,
      minus: Number(p.amount),
      payId: p.id,
    })),
  ].sort((a, b) => (a.day === b.day ? a.at.localeCompare(b.at) : a.day.localeCompare(b.day)));
  const rows = entries.reduce<(Entry & { balance: number })[]>((acc, e) => {
    const prev = acc.length ? acc[acc.length - 1].balance : 0;
    acc.push({ ...e, balance: prev + e.plus - e.minus });
    return acc;
  }, []);
  const owed = rows.length ? rows[rows.length - 1].balance : 0;

  return (
    <div className="space-y-4">
      <PageHeader
        title={s.name}
        back="/dashboard/accounts/suppliers"
        actions={
          <>
            {s.phone && (
              <a href={whatsappLink(s.phone, "")} target="_blank" rel="noopener noreferrer" className="btn btn-outline">
                واتساب
              </a>
            )}
            <Link href={`/dashboard/accounts/purchases/new?supplier=${s.id}`} className="btn">
              فاتورة شراء
            </Link>
          </>
        }
      />
      <AccountsTabs active="/dashboard/accounts/suppliers" />
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <Card title="كشف الحساب" action={<span className="text-[13px]">{owed > 0.009 ? "عليك" : owed < -0.009 ? "لك" : "الرصيد"}: <b dir="ltr" className={owed > 0.009 ? "text-red-700" : ""}>{money(Math.abs(owed))}</b></span>}>
          {rows.length === 0 ? (
            <p className="text-[13px] text-muted">لا فواتير ولا دفعات بعد.</p>
          ) : (
            <ul className="divide-y divide-black/5 text-[13px]">
              {rows.map((r) => (
                <li key={r.key} className="flex items-center justify-between gap-2 py-2">
                  <span className="min-w-0">
                    {r.href ? <Link href={r.href} className="hover:underline">{r.label}</Link> : r.label}
                    <span className="block text-xs text-muted">{dayLabel(r.day)}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="text-left">
                      <span className={r.plus ? "" : "text-[#1a7f37]"} dir="ltr">{r.plus ? `+${money(r.plus)}` : `-${money(r.minus)}`}</span>
                      <span className="block text-xs text-muted" dir="ltr">{money(r.balance)}</span>
                    </span>
                    {r.payId && (
                      <form action={deleteSupplierPayment}>
                        <input type="hidden" name="id" value={r.payId} />
                        <input type="hidden" name="supplier_id" value={s.id} />
                        <button className="rounded p-1 text-muted hover:text-red-700" aria-label="حذف الدفعة">✕</button>
                      </form>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <div className="space-y-4">
          <Card title="تسجيل دفعة للمورد">
            <PayForm supplierId={s.id} owed={Math.max(0, Math.round(owed * 100) / 100)} today={todayDamascus()} paidFrom={PAID_FROM} branches={branchList(store)} />
          </Card>
          <details className="card p-4 text-[13px]">
            <summary className="cursor-pointer font-semibold">تعديل بيانات المورد</summary>
            <div className="mt-3">
              <SupplierForm supplier={{ id: s.id, name: s.name, phone: s.phone, note: s.note }} />
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
