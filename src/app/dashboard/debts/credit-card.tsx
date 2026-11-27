import { Card } from "@/components/admin-ui";
import { orderDue, type OrderPayment } from "@/lib/debts";
import type { Order } from "@/lib/types";
import { setCredit } from "./actions";
import { PayForm } from "./pay-form";

/** On the order page: sell on credit, record payments, see what is left. */
export function CreditCard({
  order: o,
  payments,
  money,
}: {
  order: Order;
  payments: OrderPayment[] | null;
  money: (n: number) => string;
}) {
  if (o.status === "cancelled" || o.payment_status === "refunded") return null;
  const day = (d: string) =>
    new Intl.DateTimeFormat("ar-SY", { dateStyle: "medium", timeZone: "Asia/Damascus" }).format(new Date(d));
  // payments === null: the debt tables are not in the database yet.
  if (payments === null)
    return (
      <Card title="البيع بالآجل">
        <p className="text-[13px] text-muted">تُفعَّل هذه الميزة بعد تشغيل التحديث 013 في قاعدة البيانات.</p>
      </Card>
    );
  const { paid, due } = orderDue(o, payments);

  if (!o.on_credit) {
    if (o.payment_status === "paid") return null;
    return (
      <Card title="البيع بالآجل">
        <p className="mb-3 text-[13px] text-muted">
          إذا كان الزبون سيدفع لاحقاً أو على دفعات، سجّل الطلب ديناً. يظهر في صفحة الديون حتى يُسدَّد.
        </p>
        <form action={setCredit}>
          <input type="hidden" name="id" value={o.id} />
          <input type="hidden" name="on" value="1" />
          <button type="submit" className="btn btn-outline">تسجيل الطلب ديناً</button>
        </form>
      </Card>
    );
  }

  return (
    <Card title="البيع بالآجل">
      <div className="mb-3 grid grid-cols-3 gap-2 text-center text-[13px]">
        <div className="rounded-lg bg-black/[0.04] p-2">
          <div className="text-muted">قيمة الطلب</div>
          <b>{money(Number(o.total) - Number(o.refunded ?? 0))}</b>
        </div>
        <div className="rounded-lg bg-black/[0.04] p-2">
          <div className="text-muted">المدفوع</div>
          <b>{money(paid)}</b>
        </div>
        <div className={`rounded-lg p-2 ${due > 0 ? "bg-[#fff1e3]" : "bg-[#e6f6ea]"}`}>
          <div className="text-muted">المتبقي</div>
          <b>{due > 0 ? money(due) : "سُدّد"}</b>
        </div>
      </div>
      {payments.length > 0 && (
        <ul className="mb-3 divide-y divide-black/5 text-[13px]">
          {payments.map((p) => (
            <li key={p.id} className="flex justify-between gap-2 py-1.5">
              <span>
                {day(p.created_at)}
                {p.note && <span className="text-muted"> · {p.note}</span>}
              </span>
              <b>{money(Number(p.amount))}</b>
            </li>
          ))}
        </ul>
      )}
      {due > 0 && <PayForm orderId={o.id} due={due} />}
      {payments.length === 0 && (
        <form action={setCredit} className="mt-2">
          <input type="hidden" name="id" value={o.id} />
          <input type="hidden" name="on" value="0" />
          <button type="submit" className="text-[13px] text-muted underline">إلغاء تسجيله ديناً</button>
        </form>
      )}
    </Card>
  );
}
