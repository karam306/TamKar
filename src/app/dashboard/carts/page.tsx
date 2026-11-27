import { EmptyState, PageHeader } from "@/components/admin-ui";
import { requireAccess } from "@/lib/auth";
import { liveFx, money } from "@/lib/fx";
import { supabaseAdmin } from "@/lib/supabase";
import { storeUrl } from "@/lib/urls";
import { Remind } from "./remind";

type Row = {
  id: string;
  phone: string;
  name: string | null;
  items: { title: string; price: number; qty: number }[];
  subtotal: number;
  reminded_at: string | null;
  updated_at: string;
};

/** Customers who typed their phone at checkout and left without ordering. */
export default async function CartsPage() {
  const { store } = await requireAccess("orders");
  const now = Date.now();
  const { data, error } = await supabaseAdmin()
    .from("abandoned_carts")
    .select("id, phone, name, items, subtotal, reminded_at, updated_at")
    .eq("store_id", store.id)
    .is("recovered_order_id", null)
    .lte("updated_at", new Date(now - 30 * 60_000).toISOString())
    .gte("updated_at", new Date(now - 30 * 86400_000).toISOString())
    .order("updated_at", { ascending: false })
    .limit(200);
  const m = money(store.currency, liveFx(store));
  const ago = (d: string) => {
    const h = Math.floor((now - new Date(d).getTime()) / 3600_000);
    return h < 1 ? "منذ أقل من ساعة" : h < 24 ? `منذ ${h} ساعة` : `منذ ${Math.floor(h / 24)} يوم`;
  };
  const rows = (data ?? []) as Row[];
  const link = `${storeUrl(store.slug)}/cart`;

  return (
    <div className="space-y-4">
      <PageHeader title="السلات المتروكة" />
      {error ? (
        <EmptyState title="تُفعَّل هذه الصفحة بعد تشغيل التحديث 015 في قاعدة البيانات." />
      ) : rows.length === 0 ? (
        <EmptyState
          title="لا سلات متروكة."
          text="عندما يكتب زبون رقم هاتفه في صفحة الطلب ويغادر دون إتمامه، يظهر هنا بعد نصف ساعة، مع زر لتذكيره عبر واتساب."
        />
      ) : (
        <>
          <p className="text-[13px] text-muted">
            {rows.length} {rows.length === 1 ? "زبون" : "زبائن"} لم يكملوا طلباتهم خلال آخر ٣٠ يوماً. تذكير لطيف يعيد كثيراً منهم.
          </p>
          {rows.map((r) => {
            const total = m.totals(r.items.map((i) => ({ price: Number(i.price), qty: i.qty }))).total;
            const text = [
              `مرحباً${r.name ? ` ${r.name}` : ""}،`,
              `لاحظنا أنك لم تكمل طلبك من ${store.name}:`,
              ...r.items.map((i) => `• ${i.title} × ${i.qty}`),
              `سلتك محفوظة، ويمكنك إكمال الطلب من هنا: ${link}`,
            ].join("\n");
            return (
              <section key={r.id} className="card space-y-2 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-semibold">
                    {r.name || "زبون"} <span dir="ltr" className="text-[13px] font-normal text-muted">+{r.phone}</span>
                  </span>
                  <span className="text-[13px] text-muted">
                    {ago(r.updated_at)}
                    {r.reminded_at && <span className="ms-2 rounded-full bg-black/5 px-2 py-0.5">ذُكّر</span>}
                  </span>
                </div>
                <ul className="text-[13px] text-muted">
                  {r.items.map((i, k) => (
                    <li key={k}>
                      {i.title} × {i.qty}
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <b>{m.text(total)}</b>
                  <Remind id={r.id} phone={r.phone} base={text} />
                </div>
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}
