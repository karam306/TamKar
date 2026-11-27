import Link from "next/link";
import { notFound } from "next/navigation";
import { refresh, revalidatePath } from "next/cache";
import { Card, PageHeader } from "@/components/admin-ui";
import { requireAccess } from "@/lib/auth";
import { liveLoyalty, loyaltyText } from "@/lib/loyalty";
import { pointsOf } from "@/lib/loyalty-server";
import { RedeemPoints } from "../redeem";
import { formatPrice, whatsappLink } from "@/lib/format";
import { normalizeWhatsapp } from "@/lib/templates";
import type { Customer, Order } from "@/lib/types";
import { StatusBadge } from "../../orders/status";

async function saveNote(form: FormData) {
  "use server";
  const { store, db } = await requireAccess("customers");
  const id = String(form.get("id") ?? "");
  await db
    .from("customers")
    .update({
      note:
        String(form.get("note") ?? "")
          .trim()
          .slice(0, 1000) || null,
    })
    .eq("id", id)
    .eq("store_id", store.id);
  revalidatePath(`/dashboard/customers/${id}`);
  refresh();
}

export default async function CustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { store, db } = await requireAccess("customers");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [{ data }, { data: orders }] = await Promise.all([
    db
      .from("customers")
      .select("*")
      .eq("id", id)
      .eq("store_id", store.id)
      .maybeSingle(),
    db
      .from("orders")
      .select("*")
      .eq("customer_id", id)
      .eq("store_id", store.id)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  if (!data) notFound();
  const c = data as Customer;
  const points = liveLoyalty(store) ? await pointsOf(store.id, c.phone) : null;
  const list = (orders ?? []) as Order[];
  const money = (n: number) => formatPrice(n, store.currency);
  const date = new Intl.DateTimeFormat("ar-SY", {
    dateStyle: "medium",
    timeZone: "Asia/Damascus",
  });
  const avg = c.orders_count ? Number(c.total_spent) / c.orders_count : 0;

  return (
    <div>
      <PageHeader
        title={c.name}
        back="/dashboard/customers"
        actions={
          <Link href={`/dashboard/orders/new?customer=${c.id}`} className="btn">
            طلب جديد لهذا الزبون
          </Link>
        }
      />
      <div className="grid items-start gap-4 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          <div className="card grid grid-cols-3 divide-x divide-x-reverse divide-black/5 text-center">
            <div className="p-4">
              <div className="text-xs text-muted">مجموع المشتريات</div>
              <div className="text-lg font-semibold">
                {money(Number(c.total_spent))}
              </div>
            </div>
            <div className="p-4">
              <div className="text-xs text-muted">الطلبات</div>
              <div className="text-lg font-semibold">{c.orders_count}</div>
            </div>
            <div className="p-4">
              <div className="text-xs text-muted">متوسط الطلب</div>
              <div className="text-lg font-semibold">{money(avg)}</div>
            </div>
          </div>
          <Card title="الطلبات">
            <ul className="divide-y divide-black/5 text-[13px]">
              {list.map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/dashboard/orders/${o.id}`}
                    className="flex items-center justify-between gap-3 py-2.5 hover:bg-[#f7f7f7]"
                  >
                    <span className="font-semibold">#{o.number}</span>
                    <span className="text-muted">
                      {date.format(new Date(o.created_at))}
                    </span>
                    <StatusBadge
                      status={o.status}
                      pickup={o.fulfillment === "pickup"}
                    />
                    <span>{money(Number(o.total))}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>
        <div className="space-y-4">
          <Card title="معلومات التواصل">
            <div className="space-y-1 text-[13px]">
              <div dir="ltr" className="text-right">
                {c.phone}
              </div>
              <div>{c.city}</div>
              <div className="text-muted">{c.address}</div>
              <div className="flex gap-2 pt-2">
                <a
                  href={whatsappLink(normalizeWhatsapp(c.phone))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn !bg-[#25D366]"
                >
                  واتساب
                </a>
                <a href={`tel:${c.phone}`} className="btn btn-outline">
                  اتصال
                </a>
              </div>
            </div>
          </Card>
          {(() => {
            const l = liveLoyalty(store);
            if (!l) return null;
            return (
              <Card title="نقاط الولاء">
                {points === null ? (
                  <p className="text-[13px] text-muted">تعمل النقاط بعد تشغيل التحديث 015 في قاعدة البيانات.</p>
                ) : (
                  <div className="space-y-3 text-[13px]">
                    <div className="flex items-baseline justify-between">
                      <span className="text-muted">الرصيد</span>
                      <b className="text-xl">{points.balance}</b>
                    </div>
                    <p className="text-muted">{loyaltyText(l, store.currency)}</p>
                    {points.balance >= l.block ? (
                      <RedeemPoints
                        customerId={c.id}
                        phone={normalizeWhatsapp(c.phone)}
                        name={c.name}
                        store={store.name}
                        unit={store.currency === "SYP" ? "ل.س" : "$"}
                      />
                    ) : (
                      <p className="text-muted">يبقى {l.block - points.balance} نقطة حتى أول خصم.</p>
                    )}
                    {points.rows.length > 0 && (
                      <ul className="divide-y divide-black/5">
                        {points.rows.slice(0, 10).map((r) => (
                          <li key={r.id as string} className="flex justify-between py-1.5">
                            <span className="text-muted">{r.note}</span>
                            <b className={Number(r.points) > 0 ? "text-[#29845a]" : ""}>
                              {Number(r.points) > 0 ? "+" : ""}
                              {r.points}
                            </b>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </Card>
            );
          })()}
          <Card title="ملاحظات">
            <form action={saveNote} className="space-y-2">
              <input type="hidden" name="id" value={c.id} />
              <textarea
                name="note"
                rows={3}
                defaultValue={c.note ?? ""}
                className="input"
                placeholder="مثلاً: يفضّل التوصيل مساءً"
              />
              <button className="btn btn-outline">حفظ</button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
