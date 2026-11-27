import Link from "next/link";
import { Card, PageHeader } from "@/components/admin-ui";
import { ProGate } from "@/components/pro-gate";
import {
  ensureRecurring,
  lineCost,
  loadCosts,
  loadSavedCosts,
  monthBounds,
  monthKey,
  monthLabel,
  ordersBetween,
  profitOf,
} from "@/lib/accounts";
import { requireOwner } from "@/lib/auth";
import { formatPrice } from "@/lib/format";
import { isPro } from "@/lib/plans";
import { supabaseAdmin } from "@/lib/supabase";
import { AccountsTabs, MonthNav, Need018, Stat } from "./ui";

/** The month's profit: sales − cost of goods − expenses. */
export default async function ProfitPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { store } = await requireOwner();
  const month = monthKey((await searchParams).m);
  const b = monthBounds(month);
  const pb = monthBounds(b.prev);
  const db = supabaseAdmin();
  const money = (n: number) => formatPrice(Math.round(n * 100) / 100, store.currency);
  const pro = isPro(store);

  await ensureRecurring(store.id).catch(() => {});
  const [orders, prevOrders, costs, exp, prevExp] = await Promise.all([
    ordersBetween(store.id, b.fromTs, b.toTs),
    ordersBetween(store.id, pb.fromTs, pb.toTs),
    loadCosts(store.id),
    db.from("expenses").select("amount, category").eq("store_id", store.id).gte("day", b.first).lt("day", b.nextFirst).limit(5000),
    db.from("expenses").select("amount").eq("store_id", store.id).gte("day", pb.first).lt("day", pb.nextFirst).limit(5000),
  ]);
  const header = (
    <>
      <PageHeader title="الحسابات" actions={pro ? <a href={`/api/export/accounts?m=${month}`} className="btn btn-outline">تصدير Excel</a> : null} />
      <AccountsTabs active="/dashboard/accounts" />
    </>
  );
  if (exp.error) return (<div>{header}<Need018 /></div>);

  const [saved, prevSaved] = await Promise.all([loadSavedCosts(orders.map((o) => o.id)), loadSavedCosts(prevOrders.map((o) => o.id))]);
  const p = profitOf(orders, saved, costs);
  const pp = profitOf(prevOrders, prevSaved, costs);
  const expenses = (exp.data ?? []).reduce((s, e) => s + Number(e.amount), 0);
  const prevExpenses = (prevExp.data ?? []).reduce((s, e) => s + Number(e.amount), 0);
  const gross = p.sales - p.cogs;
  const net = gross - expenses;
  const prevNet = pp.sales - pp.cogs - prevExpenses;
  const change = prevNet !== 0 ? Math.round(((net - prevNet) / Math.abs(prevNet)) * 100) : null;
  const count = orders.filter((o) => o.status !== "cancelled").length;

  const byCat = new Map<string, number>();
  for (const e of exp.data ?? []) byCat.set(e.category, (byCat.get(e.category) ?? 0) + Number(e.amount));

  // Most profitable products this month (today's costs).
  const prod = new Map<string, { title: string; qty: number; sales: number; profit: number | null }>();
  for (const o of orders) {
    if (o.status === "cancelled") continue;
    for (const l of o.items ?? []) {
      const key = l.productId;
      const r = prod.get(key) ?? { title: l.title, qty: 0, sales: 0, profit: 0 };
      const sales = Number(l.price) * Number(l.qty);
      const c = lineCost(costs, l);
      r.qty += Number(l.qty);
      r.sales += sales;
      r.profit = c == null || r.profit == null ? null : r.profit + sales - c;
      prod.set(key, r);
    }
  }
  const top = [...prod.values()].filter((r) => r.profit != null).sort((a, b) => (b.profit ?? 0) - (a.profit ?? 0)).slice(0, 10);

  return (
    <div className="space-y-4">
      {header}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <MonthNav month={month} path="/dashboard/accounts" />
        <span className="text-xs text-muted">{count} طلب في {monthLabel(month)}</span>
      </div>

      <Card>
        <div className="space-y-2 text-[14px]">
          <Row label="المبيعات" value={money(p.sales)} hint={pro ? `أونلاين ${money(p.online)} · في المحل ${money(p.shop)}` : undefined} />
          <Row label="− تكلفة البضاعة المباعة" value={money(p.cogs)} />
          <Row label="= الربح الإجمالي" value={money(gross)} strong hint={p.sales > 0 ? `${Math.round((gross / p.sales) * 100)}٪ من المبيعات` : undefined} />
          <Row label="− المصاريف" value={money(expenses)} link="/dashboard/accounts/expenses" />
          <div className="border-t border-black/10 pt-2">
            <Row label="= صافي الربح" value={money(net)} strong big tone={net >= 0 ? "good" : "bad"} />
          </div>
        </div>
        {p.missingLines > 0 && (
          <p className="mt-3 rounded-lg bg-[#fff4d6] p-2.5 text-[13px] text-[#5c4300]">
            {p.missingLines} من المنتجات المباعة هذا الشهر دون سعر تكلفة، فالربح أعلى من حقيقته.{" "}
            <Link href="/dashboard/accounts/costs?missing=1" className="font-semibold underline">
              أضف أسعار التكلفة
            </Link>
          </p>
        )}
        <p className="mt-3 text-xs text-muted">
          لا تُحسب أجور التوصيل ({money(p.delivery)}) ضمن المبيعات لأنها تذهب عادةً إلى عامل التوصيل. الخصومات ({money(p.discounts)}) مطروحة من المبيعات أصلاً، وكذلك المبالغ المُرجعة.
        </p>
      </Card>

      {pro ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="صافي ربح الشهر الماضي" value={money(prevNet)} />
            <Stat
              label="التغيّر"
              value={change == null ? "-" : `${change > 0 ? "+" : ""}${change}٪`}
              tone={change == null ? undefined : change >= 0 ? "good" : "bad"}
            />
            <Stat label="متوسط الربح في الطلب" value={count ? money(net / count) : "-"} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="أكثر المنتجات ربحاً">
              {top.length === 0 ? (
                <p className="text-[13px] text-muted">تظهر هنا بعد إضافة أسعار التكلفة وتسجيل المبيعات.</p>
              ) : (
                <ul className="divide-y divide-black/5 text-[13px]">
                  {top.map((r, i) => (
                    <li key={i} className="flex items-center justify-between gap-2 py-2">
                      <span className="min-w-0 truncate">
                        {r.title} <span className="text-muted">× {r.qty}</span>
                      </span>
                      <span className="shrink-0 font-semibold text-[#1a7f37]" dir="ltr">{money(r.profit ?? 0)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card title="المصاريف حسب النوع">
              {byCat.size === 0 ? (
                <p className="text-[13px] text-muted">لا مصاريف في هذا الشهر.</p>
              ) : (
                <ul className="divide-y divide-black/5 text-[13px]">
                  {[...byCat.entries()].sort((a, b) => b[1] - a[1]).map(([c, v]) => (
                    <li key={c} className="flex justify-between gap-2 py-2">
                      <span>{c}</span>
                      <span dir="ltr">{money(v)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      ) : (
        <ProGate feature="المقارنة بالشهر الماضي وأكثر المنتجات ربحاً والتصدير" compact />
      )}
    </div>
  );
}

function Row({ label, value, hint, strong, big, tone, link }: { label: string; value: string; hint?: string; strong?: boolean; big?: boolean; tone?: "good" | "bad"; link?: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className={strong ? "font-semibold" : ""}>{link ? <Link href={link} className="hover:underline">{label}</Link> : label}</div>
        {hint && <div className="text-xs text-muted">{hint}</div>}
      </div>
      <div className={`shrink-0 ${strong ? "font-bold" : ""} ${big ? "text-xl" : ""} ${tone === "good" ? "text-[#1a7f37]" : tone === "bad" ? "text-red-700" : ""}`} dir="ltr">
        {value}
      </div>
    </div>
  );
}
