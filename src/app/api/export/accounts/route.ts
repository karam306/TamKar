import {
  branchName,
  lineCost,
  loadCosts,
  loadSavedCosts,
  monthBounds,
  monthKey,
  ordersBetween,
  PAID_FROM,
  profitOf,
  supplierBalances,
} from "@/lib/accounts";
import { getMerchant } from "@/lib/auth";
import { isPro } from "@/lib/plans";
import { buildBook } from "@/lib/sheets";
import { supabaseAdmin } from "@/lib/supabase";

const r2 = (n: number) => Math.round(n * 100) / 100;

/** One Excel file for the accountant: summary, sales, expenses, purchases and suppliers of a month. */
export async function GET(req: Request) {
  const m = await getMerchant();
  if (!m || m.role !== "owner") return new Response("Unauthorized", { status: 401 });
  if (!isPro(m.store)) return new Response("التصدير متاح في الباقة الاحترافية", { status: 403, headers: { "content-type": "text/plain; charset=utf-8" } });
  const store = m.store;
  const month = monthKey(new URL(req.url).searchParams.get("m"));
  const b = monthBounds(month);
  const db = supabaseAdmin();

  const [orders, costs, { data: exps }, { data: buys }, { data: sups }, owed] = await Promise.all([
    ordersBetween(store.id, b.fromTs, b.toTs),
    loadCosts(store.id),
    db.from("expenses").select("*").eq("store_id", store.id).gte("day", b.first).lt("day", b.nextFirst).order("day"),
    db.from("purchases").select("*").eq("store_id", store.id).gte("day", b.first).lt("day", b.nextFirst).order("day"),
    db.from("suppliers").select("id, name, phone").eq("store_id", store.id).order("name"),
    supplierBalances(store.id),
  ]);
  const saved = await loadSavedCosts(orders.map((o) => o.id));
  const p = profitOf(orders, saved, costs);
  const expenses = (exps ?? []).reduce((s, e) => s + Number(e.amount), 0);
  const names = new Map((sups ?? []).map((s) => [s.id as string, s.name as string]));
  const cur = store.currency === "SYP" ? "ل.س" : "USD";

  const file = await buildBook([
    {
      name: "الملخص",
      headers: ["البند", `المبلغ (${cur})`],
      rows: [
        ["الشهر", month],
        ["المبيعات (دون التوصيل)", r2(p.sales)],
        ["منها أونلاين", r2(p.online)],
        ["منها في المحل", r2(p.shop)],
        ["تكلفة البضاعة المباعة", r2(p.cogs)],
        ["الربح الإجمالي", r2(p.sales - p.cogs)],
        ["المصاريف", r2(expenses)],
        ["صافي الربح", r2(p.sales - p.cogs - expenses)],
        ["أجور التوصيل المحصّلة", r2(p.delivery)],
        ["الخصومات", r2(p.discounts)],
        ["منتجات مباعة دون سعر تكلفة", p.missingLines],
      ],
    },
    {
      name: "المبيعات",
      headers: ["التاريخ", "المنتج", "الخيار", "الكمية", "سعر البيع", "المبيعات", "التكلفة (اليوم)", "الربح", "المصدر"],
      rows: orders
        .filter((o) => o.status !== "cancelled")
        .flatMap((o) =>
          (o.items ?? []).map((l) => {
            const sales = Number(l.price) * Number(l.qty);
            const c = lineCost(costs, l);
            return [
              new Date(o.created_at).toLocaleDateString("en-CA", { timeZone: "Asia/Damascus" }),
              l.title,
              l.variantTitle ?? "",
              Number(l.qty),
              Number(l.price),
              r2(sales),
              c == null ? "" : r2(c),
              c == null ? "" : r2(sales - c),
              o.in_store ? "المحل" : "أونلاين",
            ];
          }),
        ),
    },
    {
      name: "المصاريف",
      headers: ["التاريخ", "النوع", "المبلغ", "دُفع من", "الفرع", "ملاحظة"],
      rows: (exps ?? []).map((e) => [e.day, e.category, Number(e.amount), PAID_FROM[e.paid_from] ?? e.paid_from, branchName(store, e.branch), e.note ?? ""]),
    },
    {
      name: "المشتريات",
      headers: ["التاريخ", "المورد", "رقم الفاتورة", "الأصناف", "المجموع", "المدفوع", "المتبقي"],
      rows: (buys ?? []).map((x) => [
        x.day,
        x.supplier_id ? names.get(x.supplier_id) ?? "" : "",
        x.ref ?? "",
        ((x.items as { title: string; qty: number; cost: number }[]) ?? []).map((l) => `${l.title} × ${l.qty} @ ${l.cost}`).join("، "),
        Number(x.total),
        Number(x.paid),
        r2(Number(x.total) - Number(x.paid)),
      ]),
    },
    {
      name: "الموردون",
      headers: ["المورد", "الهاتف", "الرصيد المستحق عليك"],
      rows: (sups ?? []).map((s) => [s.name, s.phone ?? "", r2(owed.get(s.id) ?? 0)]),
    },
  ]);
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="accounts-${month}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
