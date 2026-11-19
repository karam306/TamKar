import type { Order, OrderStatus } from "@/lib/types";

export const ORDER_STATUSES: { id: OrderStatus; label: string; className: string }[] = [
  { id: "new", label: "جديد", className: "bg-[#ffd6a4] text-[#5e4200]" },
  { id: "confirmed", label: "مؤكد", className: "bg-[#e0f0ff] text-[#00527c]" },
  { id: "shipped", label: "قيد التوصيل", className: "bg-[#eae4ff] text-[#5700d1]" },
  { id: "delivered", label: "تم التوصيل", className: "bg-[#affebf] text-[#014b40]" },
  { id: "cancelled", label: "ملغي", className: "bg-[#e3e3e3] text-[#616161]" },
];

/** What the merchant usually does next for each status. */
export const NEXT_STEP: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  new: { to: "confirmed", label: "تأكيد الطلب" },
  confirmed: { to: "shipped", label: "طلع للتوصيل" },
  shipped: { to: "delivered", label: "تم التوصيل" },
};

export function StatusBadge({ status }: { status: Order["status"] }) {
  const s = ORDER_STATUSES.find((x) => x.id === status) ?? ORDER_STATUSES[0];
  return <span className={`badge ${s.className}`}>● {s.label}</span>;
}

export function PaymentBadge({ status }: { status?: Order["payment_status"] }) {
  return status === "paid" ? (
    <span className="badge bg-[#e3e3e3] text-[#303030]">● مدفوع</span>
  ) : (
    <span className="badge bg-[#ffeb78] text-[#4f4700]">● الدفع عند الاستلام</span>
  );
}
