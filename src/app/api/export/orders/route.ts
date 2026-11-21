import { isPro } from "@/lib/plans";
import { getMerchant } from "@/lib/auth";
import { buildSheet } from "@/lib/sheets";
import type { Order } from "@/lib/types";

const STATUS: Record<string, string> = { new: "جديد", confirmed: "مؤكد", shipped: "قيد التوصيل", delivered: "تم التوصيل", cancelled: "ملغي" };

export async function GET(req: Request) {
  const m = await getMerchant();
  if (!m || m.role !== "owner") return new Response("Unauthorized", { status: 401 });
  if (!isPro(m.store)) return new Response("التصدير لـ Excel متاح بالباقة الاحترافية", { status: 403, headers: { "content-type": "text/plain; charset=utf-8" } });
  const status = new URL(req.url).searchParams.get("status");
  const all: Order[] = [];
  for (let from = 0; from < 50000; from += 1000) {
    let q = m.db.from("orders").select("*").eq("store_id", m.store.id);
    if (status && STATUS[status]) q = q.eq("status", status);
    const { data } = await q.order("created_at", { ascending: false }).range(from, from + 999);
    all.push(...((data ?? []) as Order[]));
    if (!data || data.length < 1000) break;
  }
  const rows = all.map((o) => [
    o.number,
    new Date(o.created_at).toLocaleString("en-GB", { timeZone: "Asia/Damascus" }),
    o.customer_name,
    o.phone,
    o.city,
    o.address,
    o.items.map((i) => `${i.title}${i.variantTitle ? ` (${i.variantTitle})` : ""} × ${i.qty}`).join("، "),
    Number(o.subtotal ?? o.total),
    Number(o.discount_amount ?? 0),
    o.discount_code ?? "",
    Number(o.shipping_fee ?? 0),
    Number(o.total),
    o.payment_status === "paid" ? "مدفوع" : "غير مدفوع",
    STATUS[o.status] ?? o.status,
    o.notes ?? "",
  ]);
  const file = await buildSheet("الطلبات", ["رقم الطلب", "التاريخ", "الزبون", "الهاتف", "المدينة", "العنوان", "المنتجات", "المجموع الفرعي", "الخصم", "كود الخصم", "التوصيل", "المجموع", "الدفع", "الحالة", "ملاحظات"], rows);
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="orders-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
