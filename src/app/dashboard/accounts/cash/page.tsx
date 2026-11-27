import Link from "next/link";
import { Card, PageHeader } from "@/components/admin-ui";
import { ProGate } from "@/components/pro-gate";
import { branchList, dayLabel, todayDamascus } from "@/lib/accounts";
import { requireOwner } from "@/lib/auth";
import { formatPrice } from "@/lib/format";
import { isPro } from "@/lib/plans";
import { supabaseAdmin } from "@/lib/supabase";
import { AccountsTabs, Need018 } from "../ui";
import { CloseForm } from "./close-form";

const nextDay = (d: string) => new Date(new Date(`${d}T12:00:00Z`).getTime() + 86400000).toISOString().slice(0, 10);

/**
 * The daily cash close: opening balance + cash taken in the shop − cash paid out
 * = what should be in the drawer. The owner counts it and the difference is kept.
 */
export default async function CashPage({ searchParams }: { searchParams: Promise<{ day?: string; b?: string }> }) {
  const { store } = await requireOwner();
  const sp = await searchParams;
  const today = todayDamascus();
  const day = sp.day && /^\d{4}-\d{2}-\d{2}$/.test(sp.day) && sp.day <= today ? sp.day : today;
  const branches = branchList(store);
  const branch = branches.some((b) => b.id === sp.b) ? (sp.b as string) : "";
  const branchName = branches.find((b) => b.id === branch)?.name ?? "المحل الرئيسي";
  const header = (
    <>
      <PageHeader title="الحسابات" />
      <AccountsTabs active="/dashboard/accounts/cash" />
    </>
  );
  if (!isPro(store))
    return (
      <div>
        {header}
        <ProGate feature="إغلاق الصندوق اليومي" />
      </div>
    );

  const db = supabaseAdmin();
  const money = (n: number) => formatPrice(Math.round(n * 100) / 100, store.currency);
  const from = `${day}T00:00:00+03:00`;
  const to = `${nextDay(day)}T00:00:00+03:00`;
  const main = branch === "";

  const [closes, sales, pays, exps, buys, supPays, prevClose] = await Promise.all([
    db.from("cash_closes").select("*").eq("store_id", store.id).eq("branch", branch).order("day", { ascending: false }).limit(14),
    db
      .from("orders")
      .select("total, refunded, branch, payment_method, on_credit, status")
      .eq("store_id", store.id)
      .eq("in_store", true)
      .gte("created_at", from)
      .lt("created_at", to)
      .limit(5000),
    main ? db.from("order_payments").select("amount, method").eq("store_id", store.id).gte("created_at", from).lt("created_at", to) : Promise.resolve({ data: [] as { amount: number; method: string }[] }),
    db.from("expenses").select("amount").eq("store_id", store.id).eq("day", day).eq("branch", branch).eq("paid_from", "cash"),
    db.from("purchases").select("paid").eq("store_id", store.id).eq("day", day).eq("branch", branch).eq("paid_from", "cash"),
    db.from("supplier_payments").select("amount").eq("store_id", store.id).eq("day", day).eq("branch", branch).eq("paid_from", "cash"),
    db.from("cash_closes").select("counted, day").eq("store_id", store.id).eq("branch", branch).lt("day", day).order("day", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (closes.error) return (<div>{header}<Need018 /></div>);

  // Orders keep the branch's name; the main shop's sales have none.
  const ownName = branches.find((b) => b.id === branch)?.name;
  const cashSales = (sales.data ?? [])
    .filter((o) => o.status !== "cancelled" && !o.on_credit && (o.payment_method ?? "cod") === "cod")
    .filter((o) => (main ? !o.branch || !branches.some((b) => b.id && b.name === o.branch) : o.branch === ownName))
    .reduce((s, o) => s + Number(o.total) - Number(o.refunded ?? 0), 0);
  const debtCash = (pays.data ?? []).filter((p) => (p.method ?? "cash") === "cash").reduce((s, p) => s + Number(p.amount), 0);
  const expCash = (exps.data ?? []).reduce((s, e) => s + Number(e.amount), 0);
  const buyCash = (buys.data ?? []).reduce((s, e) => s + Number(e.paid), 0);
  const supCash = (supPays.data ?? []).reduce((s, e) => s + Number(e.amount), 0);
  const movement = cashSales + debtCash - expCash - buyCash - supCash;
  const todayClose = (closes.data ?? []).find((c) => c.day === day) ?? null;
  const opening = todayClose ? Number(todayClose.opening) : Number(prevClose.data?.counted ?? 0);
  const unit = store.currency === "SYP" ? "ل.س" : "$";

  const lines: [string, number, string?][] = [
    ["+ مبيعات نقدية في المحل", cashSales],
    ...(main ? [["+ دفعات ديون استُلمت نقداً", debtCash] as [string, number]] : []),
    ["− مصاريف دُفعت نقداً", -expCash, "/dashboard/accounts/expenses"],
    ["− مشتريات دُفعت نقداً", -buyCash, "/dashboard/accounts/purchases"],
    ["− دفعات للموردين نقداً", -supCash, "/dashboard/accounts/suppliers"],
  ];

  return (
    <div className="space-y-4">
      {header}
      <form className="flex flex-wrap items-end gap-2 text-[13px]" action="/dashboard/accounts/cash">
        <label className="flex flex-col gap-1">
          <span className="text-muted">اليوم</span>
          <input type="date" name="day" defaultValue={day} max={today} className="input !py-1.5" dir="ltr" />
        </label>
        {branches.length > 1 && (
          <label className="flex flex-col gap-1">
            <span className="text-muted">الفرع</span>
            <select name="b" defaultValue={branch} className="input !py-1.5">
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <button className="btn btn-outline">عرض</button>
      </form>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={`حركة النقد: ${dayLabel(day)}${branches.length > 1 ? ` · ${branchName}` : ""}`}>
          <ul className="space-y-2 text-[13px]">
            {lines.map(([label, v, href]) => (
              <li key={label} className="flex justify-between gap-2">
                <span>{href ? <Link href={href} className="hover:underline">{label}</Link> : label}</span>
                <span dir="ltr">{money(Math.abs(v))}</span>
              </li>
            ))}
            <li className="flex justify-between gap-2 border-t border-black/10 pt-2 font-semibold">
              <span>صافي حركة اليوم</span>
              <span dir="ltr">{movement < 0 ? "-" : ""}{money(Math.abs(movement))}</span>
            </li>
          </ul>
          <p className="mt-3 text-xs text-muted">
            تُحسب المبيعات النقدية من شاشة البيع في المحل. المبيعات بالآجل والمحافظ الإلكترونية لا تدخل الصندوق، والطلبات الأونلاين يحصّلها عامل التوصيل.
          </p>
        </Card>
        <Card title={todayClose ? "أُغلق هذا اليوم" : "إغلاق الصندوق"}>
          <CloseForm
            key={`${day}-${branch}`}
            day={day}
            branch={branch}
            opening={opening}
            movement={Math.round(movement * 100) / 100}
            details={{ cashSales, debtCash, expCash, buyCash, supCash }}
            unit={unit}
            closed={todayClose ? { counted: Number(todayClose.counted), note: todayClose.note } : null}
          />
        </Card>
      </div>

      <Card title="آخر الإغلاقات">
        {(closes.data ?? []).length === 0 ? (
          <p className="text-[13px] text-muted">لم يُغلق الصندوق بعد.</p>
        ) : (
          <ul className="divide-y divide-black/5 text-[13px]">
            {(closes.data ?? []).map((c) => {
              const d = Number(c.difference);
              return (
                <li key={c.id} className="flex items-center justify-between gap-2 py-2">
                  <Link href={`/dashboard/accounts/cash?day=${c.day}${branch ? `&b=${branch}` : ""}`} className="hover:underline">
                    {dayLabel(c.day)}
                    {c.note && <span className="block text-xs text-muted">{c.note}</span>}
                  </Link>
                  <span className="text-left">
                    <span dir="ltr">{money(Number(c.counted))}</span>
                    <span className={`block text-xs ${d === 0 ? "text-[#1a7f37]" : "text-red-700"}`}>
                      {d === 0 ? "مطابق" : `${d > 0 ? "زيادة" : "نقص"} ${money(Math.abs(d))}`}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
