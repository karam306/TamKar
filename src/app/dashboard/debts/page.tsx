import Link from "next/link";
import { Card, EmptyState, PageHeader } from "@/components/admin-ui";
import { requireAccess } from "@/lib/auth";
import { orderDue, reminderText } from "@/lib/debts";
import { formatPrice, whatsappLink } from "@/lib/format";
import { supabaseAdmin } from "@/lib/supabase";

type Row = {
  id: string;
  number: number;
  customer_name: string;
  phone: string;
  total: number;
  refunded: number | null;
  created_at: string;
};

/** Who owes the shop money, how much, and a polite WhatsApp reminder for each. */
export default async function DebtsPage() {
  const { store } = await requireAccess("orders");
  const db = supabaseAdmin();
  const money = (n: number) => formatPrice(n, store.currency);
  const day = (d: string) =>
    new Intl.DateTimeFormat("ar-SY", { dateStyle: "medium", timeZone: "Asia/Damascus" }).format(new Date(d));

  const { data, error } = await db
    .from("orders")
    .select("id, number, customer_name, phone, total, refunded, created_at")
    .eq("store_id", store.id)
    .eq("on_credit", true)
    .not("payment_status", "in", "(paid,refunded)")
    .neq("status", "cancelled")
    .order("created_at")
    .limit(1000);

  if (error)
    return (
      <div>
        <PageHeader title="الديون" />
        <Card>
          <p className="text-sm">تُفعَّل صفحة الديون بعد تشغيل التحديث 013_fx_debts.sql في Supabase.</p>
        </Card>
      </div>
    );

  const orders = (data ?? []) as Row[];
  const { data: pays } = orders.length
    ? await db
        .from("order_payments")
        .select("order_id, amount, created_at")
        .in("order_id", orders.map((o) => o.id))
    : { data: [] };

  // Group by customer (phone), oldest debts first.
  type Debt = { name: string; phone: string; due: number; last: string | null; orders: (Row & { paid: number; due: number })[] };
  const byCustomer = new Map<string, Debt>();
  for (const o of orders) {
    const mine = (pays ?? []).filter((p) => p.order_id === o.id);
    const { paid, due } = orderDue(o, mine);
    if (due <= 0) continue;
    const key = o.phone || o.customer_name;
    const d = byCustomer.get(key) ?? { name: o.customer_name, phone: o.phone, due: 0, last: null, orders: [] };
    d.due += due;
    d.orders.push({ ...o, paid, due });
    for (const p of mine) if (!d.last || p.created_at > d.last) d.last = p.created_at;
    byCustomer.set(key, d);
  }
  const debts = [...byCustomer.values()].sort((a, b) => b.due - a.due);
  const total = debts.reduce((s, d) => s + d.due, 0);

  return (
    <div className="space-y-4">
      <PageHeader title="الديون" />
      {debts.length === 0 ? (
        <EmptyState
          title="لا ديون مسجّلة."
          text="عندما يشتري زبون بالآجل، افتح طلبه واضغط «تسجيل الطلب ديناً». تظهر هنا المبالغ المتبقية على كل زبون، ودفعاته، وزر لتذكيره عبر واتساب."
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="card p-4">
              <div className="text-[13px] text-muted">مجموع الديون المستحقة</div>
              <div className="text-2xl font-bold">{money(total)}</div>
            </div>
            <div className="card p-4">
              <div className="text-[13px] text-muted">عدد الزبائن</div>
              <div className="text-2xl font-bold">{debts.length}</div>
            </div>
          </div>

          {debts.map((d) => (
            <Card
              key={d.phone + d.name}
              title={d.name}
              action={
                d.phone ? (
                  <a
                    href={whatsappLink(d.phone.replace(/\D/g, ""), reminderText(d.name, store.name, money(d.due)))}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline !py-1.5 text-[13px]"
                  >
                    تذكير عبر واتساب
                  </a>
                ) : null
              }
            >
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2 text-[13px]">
                <span dir="ltr" className="text-muted">{d.phone}</span>
                <span>
                  المتبقي: <b className="text-base">{money(d.due)}</b>
                </span>
              </div>
              <p className="mb-2 text-[12px] text-muted">
                {d.last ? `آخر دفعة: ${day(d.last)}` : "لم يدفع أي دفعة بعد"}
              </p>
              <ul className="divide-y divide-black/5 text-[13px]">
                {d.orders.map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-2 py-2">
                    <Link href={`/dashboard/orders/${o.id}`} className="font-semibold text-[#005bd3] hover:underline">
                      طلب #{o.number}
                    </Link>
                    <span className="text-muted">{day(o.created_at)}</span>
                    <span className="text-muted">دفع {money(o.paid)}</span>
                    <b>{money(o.due)}</b>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}
