import Link from "next/link";
import { Card, PageHeader } from "@/components/admin-ui";
import { requireOwner } from "@/lib/auth";
import { formatPrice } from "@/lib/format";
import type { Order } from "@/lib/types";
import { BarChart } from "./bar-chart";
import { ProGate } from "@/components/pro-gate";
import { isPro } from "@/lib/plans";

const RANGES = [
  { days: 7, label: "آخر 7 أيام" },
  { days: 30, label: "آخر 30 يوم" },
  { days: 90, label: "آخر 90 يوم" },
];

type Stat = { day: string; page_views: number; sessions: number; product_views: number; add_to_carts: number; checkouts: number };

/** First day of the report period. */
function rangeStart(days: number) {
  return new Date(Date.now() - (days - 1) * 86400000);
}

const dayKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Damascus" });

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { store, db } = await requireOwner();
  const wanted = Number((await searchParams).days);
  const days = RANGES.find((r) => r.days === wanted)?.days ?? 30;
  const since = rangeStart(days);
  const sinceKey = dayKey(since);

  const [{ data: ordersData }, { data: statsData }] = await Promise.all([
    db.from("orders").select("items, total, status, city, created_at, source, discount_amount").eq("store_id", store.id).gte("created_at", `${sinceKey}T00:00:00+03:00`).limit(10000),
    db.from("store_stats").select("*").eq("store_id", store.id).gte("day", sinceKey),
  ]);
  const orders = ((ordersData ?? []) as Order[]).filter((o) => o.status !== "cancelled");

  // Pro: the period before this one, and the best customers.
  const pro = isPro(store);
  let prevSales = 0;
  let prevOrders = 0;
  let topCustomers: { id: string; name: string; orders_count: number; total_spent: number }[] = [];
  if (pro) {
    const prevKey = dayKey(new Date(since.getTime() - days * 86400000));
    const [{ data: prev }, { data: best }] = await Promise.all([
      db.from("orders").select("total, status").eq("store_id", store.id).gte("created_at", `${prevKey}T00:00:00+03:00`).lt("created_at", `${sinceKey}T00:00:00+03:00`).limit(10000),
      db.from("customers").select("id, name, orders_count, total_spent").eq("store_id", store.id).order("total_spent", { ascending: false }).limit(8),
    ]);
    const kept = (prev ?? []).filter((o) => o.status !== "cancelled");
    prevSales = kept.reduce((s, o) => s + Number(o.total), 0);
    prevOrders = kept.length;
    topCustomers = (best ?? []) as typeof topCustomers;
  }
  const stats = (statsData ?? []) as Stat[];
  const money = (n: number) => formatPrice(n, store.currency);

  const sales = orders.reduce((s, o) => s + Number(o.total), 0);
  const delivered = orders.filter((o) => o.status === "delivered").reduce((s, o) => s + Number(o.total), 0);
  const sum = (k: keyof Omit<Stat, "day">) => stats.reduce((s, r) => s + (r[k] ?? 0), 0);
  const sessions = sum("sessions");
  const online = orders.filter((o) => o.source !== "manual").length;
  const conversion = sessions ? (online / sessions) * 100 : 0;

  // Sales per day
  const series: { label: string; value: number; orders: number }[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(since.getTime() + i * 86400000);
    series.push({ label: dayKey(d), value: 0, orders: 0 });
  }
  for (const o of orders) {
    const row = series.find((s) => s.label === dayKey(new Date(o.created_at)));
    if (row) {
      row.value += Number(o.total);
      row.orders += 1;
    }
  }

  // Best sellers
  const products = new Map<string, { title: string; qty: number; revenue: number; id: string }>();
  for (const o of orders)
    for (const i of o.items) {
      const p = products.get(i.productId) ?? { title: i.title, qty: 0, revenue: 0, id: i.productId };
      p.qty += i.qty;
      p.revenue += i.qty * Number(i.price);
      products.set(i.productId, p);
    }
  const top = [...products.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 8);

  const cities = new Map<string, { orders: number; sales: number }>();
  for (const o of orders) {
    const key = o.city || "استلام من المحل";
    const c = cities.get(key) ?? { orders: 0, sales: 0 };
    c.orders += 1;
    c.sales += Number(o.total);
    cities.set(key, c);
  }
  const topCities = [...cities.entries()].sort((a, b) => b[1].sales - a[1].sales).slice(0, 8);

  const funnel = [
    { label: "زيارات", value: sessions },
    { label: "شافوا منتج", value: sum("product_views") },
    { label: "أضافوا للسلة", value: sum("add_to_carts") },
    { label: "بلّشوا الطلب", value: sum("checkouts") },
    { label: "طلبوا", value: online },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="التقارير"
        actions={
          <div className="flex rounded-lg bg-white p-0.5 shadow-[0_0_0_1px_rgba(0,0,0,0.08)]">
            {RANGES.map((r) => (
              <Link key={r.days} href={`/dashboard/analytics?days=${r.days}`} className={`rounded-md px-3 py-1 text-[13px] ${r.days === days ? "bg-[#303030] text-white" : "text-muted"}`}>
                {r.label}
              </Link>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="المبيعات" value={money(sales)} sub={`منها ${money(delivered)} تم توصيلها`} />
        <Tile label="الطلبات" value={String(orders.length)} sub={online !== orders.length ? `${orders.length - online} يدوي` : undefined} />
        <Tile label="متوسط الطلب" value={money(orders.length ? sales / orders.length : 0)} />
        <Tile label="نسبة التحويل" value={`${conversion.toFixed(1)}%`} sub={`${sessions} زيارة`} />
      </div>

      <Card title="المبيعات حسب اليوم">
        <BarChart data={series.map((s) => ({ label: s.label, value: Math.round(s.value * 100) / 100, note: `${s.orders} طلب` }))} format={store.currency} />
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="الأكثر مبيعاً">
          {top.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-muted">ما في مبيعات بهالفترة</p>
          ) : (
            <table className="w-full text-[13px]">
              <thead className="text-right text-xs text-muted">
                <tr>
                  <th className="pb-2 font-medium">المنتج</th>
                  <th className="pb-2 font-medium">القطع</th>
                  <th className="pb-2 text-left font-medium">المبيعات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {top.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2">
                      <Link href={`/dashboard/products/${p.id}`} className="hover:underline">
                        {p.title}
                      </Link>
                    </td>
                    <td className="py-2">{p.qty}</td>
                    <td className="py-2 text-left">{money(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card title="رحلة الزائر">
          <ul className="space-y-2.5 text-[13px]">
            {funnel.map((f, i) => {
              const pct = funnel[0].value ? Math.min((f.value / funnel[0].value) * 100, 100) : 0;
              return (
                <li key={f.label}>
                  <div className="mb-1 flex justify-between">
                    <span>{f.label}</span>
                    <span className="text-muted">
                      {f.value.toLocaleString("en-US")}
                      {i > 0 && funnel[0].value ? ` · ${pct.toFixed(1)}%` : ""}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[#ebebeb]">
                    <div className="h-2 rounded-full bg-[#303030]" style={{ width: `${Math.max(pct, f.value ? 1 : 0)}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
          {sessions === 0 && <p className="mt-3 text-xs text-muted">الزيارات بتنحسب من وقت ما فعّلنا التقارير، فالأرقام بتبلش تظهر مع أول زوار.</p>}
        </Card>
      </div>

      <Card title="المبيعات حسب المدينة">
        {topCities.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-muted">ما في مبيعات بهالفترة</p>
        ) : (
          <ul className="divide-y divide-black/5 text-[13px]">
            {topCities.map(([city, c]) => (
              <li key={city} className="flex justify-between py-2">
                <span>{city}</span>
                <span className="text-muted">{c.orders} طلب</span>
                <span>{money(c.sales)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {pro ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title={`مقارنة بالـ ${days} يوم اللي قبلها`}>
            <div className="grid grid-cols-2 gap-3 text-[13px]">
              <Compare label="المبيعات" now={sales} before={prevSales} fmt={money} />
              <Compare label="الطلبات" now={orders.length} before={prevOrders} fmt={(n) => String(n)} />
            </div>
          </Card>
          <Card title="أفضل الزبائن">
            {topCustomers.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-muted">لسا ما في زبائن</p>
            ) : (
              <ul className="divide-y divide-black/5 text-[13px]">
                {topCustomers.map((c) => (
                  <li key={c.id} className="flex items-center justify-between py-2">
                    <Link href={`/dashboard/customers/${c.id}`} className="hover:underline">
                      {c.name}
                    </Link>
                    <span className="text-muted">{c.orders_count} طلب</span>
                    <span>{money(Number(c.total_spent))}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      ) : (
        <ProGate feature="تقارير أفضل الزبائن ومقارنة الفترات" compact />
      )}
    </div>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card p-4">
      <div className="text-[13px] text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
    </div>
  );
}

function Compare({ label, now, before, fmt }: { label: string; now: number; before: number; fmt: (n: number) => string }) {
  const change = before ? ((now - before) / before) * 100 : null;
  return (
    <div className="rounded-lg bg-[#f7f7f7] p-3">
      <div className="text-muted">{label}</div>
      <div className="text-lg font-semibold">{fmt(now)}</div>
      <div className="text-xs text-muted">
        قبل: {fmt(before)}
        {change !== null && (
          <span className={change >= 0 ? "mr-1 text-green-700" : "mr-1 text-red-700"}>
            {change >= 0 ? "▲" : "▼"} {Math.abs(change).toFixed(0)}%
          </span>
        )}
      </div>
    </div>
  );
}
