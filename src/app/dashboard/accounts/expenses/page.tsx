import { Card, PageHeader } from "@/components/admin-ui";
import {
  branchList,
  branchName,
  dayLabel,
  ensureRecurring,
  EXPENSE_CATEGORIES,
  monthBounds,
  monthKey,
  PAID_FROM,
  todayDamascus,
} from "@/lib/accounts";
import { requireOwner } from "@/lib/auth";
import { formatPrice } from "@/lib/format";
import { supabaseAdmin } from "@/lib/supabase";
import { deleteExpense, stopRecurring } from "../actions";
import { AccountsTabs, MonthNav, Need018 } from "../ui";
import { ExpenseForm } from "./expense-form";

type Expense = { id: string; day: string; amount: number; category: string; note: string | null; paid_from: string; branch: string; recurring_id: string | null };

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { store } = await requireOwner();
  const month = monthKey((await searchParams).m);
  const b = monthBounds(month);
  const db = supabaseAdmin();
  const money = (n: number) => formatPrice(n, store.currency);

  await ensureRecurring(store.id).catch(() => {});
  const [{ data, error }, { data: rules }] = await Promise.all([
    db.from("expenses").select("*").eq("store_id", store.id).gte("day", b.first).lt("day", b.nextFirst).order("day", { ascending: false }).order("created_at", { ascending: false }).limit(2000),
    db.from("recurring_expenses").select("*").eq("store_id", store.id).order("created_at"),
  ]);
  const branches = branchList(store);

  const header = (
    <>
      <PageHeader title="الحسابات" />
      <AccountsTabs active="/dashboard/accounts/expenses" />
    </>
  );
  if (error) return (<div>{header}<Need018 /></div>);

  const list = (data ?? []) as Expense[];
  const total = list.reduce((s, e) => s + Number(e.amount), 0);
  const byCat = new Map<string, number>();
  for (const e of list) byCat.set(e.category, (byCat.get(e.category) ?? 0) + Number(e.amount));
  const cats = [...byCat.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-4">
      {header}
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <Card title="مصاريف الشهر" action={<MonthNav month={month} path="/dashboard/accounts/expenses" />}>
            <div className="mb-3 text-2xl font-bold">{money(total)}</div>
            {cats.length > 0 && (
              <ul className="mb-4 space-y-1.5 text-[13px]">
                {cats.map(([c, v]) => (
                  <li key={c} className="flex items-center gap-2">
                    <span className="w-32 shrink-0 truncate">{c}</span>
                    <span className="h-2 flex-1 overflow-hidden rounded bg-black/5">
                      <span className="block h-full rounded bg-[#8a5a2b]" style={{ width: `${Math.max(3, (v / total) * 100)}%` }} />
                    </span>
                    <span className="w-28 shrink-0 text-left" dir="ltr">{money(v)}</span>
                  </li>
                ))}
              </ul>
            )}
            {list.length === 0 ? (
              <p className="text-[13px] text-muted">لا مصاريف مسجّلة في هذا الشهر.</p>
            ) : (
              <ul className="divide-y divide-black/5 text-[13px]">
                {list.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <div className="font-semibold">
                        {e.category}
                        {e.recurring_id && <span className="badge mr-2 bg-[#eef3ff] text-[#1f3a8a]">شهري</span>}
                      </div>
                      <div className="truncate text-xs text-muted">
                        {dayLabel(e.day)} · {PAID_FROM[e.paid_from] ?? e.paid_from}
                        {branches.length > 1 ? ` · ${branchName(store, e.branch)}` : ""}
                        {e.note ? ` · ${e.note}` : ""}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="font-semibold" dir="ltr">{money(Number(e.amount))}</span>
                      <form action={deleteExpense}>
                        <input type="hidden" name="id" value={e.id} />
                        <button className="rounded p-1 text-muted hover:bg-black/5 hover:text-red-700" aria-label="حذف">
                          ✕
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        <div className="space-y-4">
          <Card title="مصروف جديد">
            <ExpenseForm
              categories={[...EXPENSE_CATEGORIES]}
              paidFrom={PAID_FROM}
              branches={branches}
              today={todayDamascus()}
              unit={store.currency === "SYP" ? "ل.س" : "$"}
            />
          </Card>
          {(rules ?? []).length > 0 && (
            <Card title="مصاريف شهرية ثابتة">
              <p className="mb-2 text-xs text-muted">تُضاف تلقائياً في يومها من كل شهر.</p>
              <ul className="divide-y divide-black/5 text-[13px]">
                {(rules ?? []).map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2 py-2">
                    <span>
                      {r.category} · يوم {r.day_of_month}
                      <span className="block text-xs text-muted" dir="ltr" style={{ textAlign: "right" }}>{money(Number(r.amount))}</span>
                    </span>
                    <form action={stopRecurring}>
                      <input type="hidden" name="id" value={r.id} />
                      <button className="btn btn-outline !py-1 text-xs">إيقاف</button>
                    </form>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
