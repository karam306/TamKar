import type { Order, OrderStatus } from "@/lib/types";
import { WALLETS } from "@/lib/wallets";

export const ORDER_STATUSES: {
  id: OrderStatus;
  label: string;
  className: string;
}[] = [
  { id: "new", label: "جديد", className: "bg-[#ffd6a4] text-[#5e4200]" },
  { id: "confirmed", label: "مؤكد", className: "bg-[#e0f0ff] text-[#00527c]" },
  {
    id: "shipped",
    label: "قيد التوصيل",
    className: "bg-[#eae4ff] text-[#5700d1]",
  },
  {
    id: "delivered",
    label: "تم التوصيل",
    className: "bg-[#affebf] text-[#014b40]",
  },
  { id: "cancelled", label: "ملغي", className: "bg-[#e3e3e3] text-[#616161]" },
];

/** Pickup orders use shop words instead of delivery words. */
const PICKUP_LABELS: Partial<Record<OrderStatus, string>> = {
  shipped: "جاهز للاستلام",
  delivered: "تم الاستلام",
};

export function statusLabel(status: OrderStatus, pickup = false): string {
  return (
    (pickup && PICKUP_LABELS[status]) ||
    (ORDER_STATUSES.find((x) => x.id === status) ?? ORDER_STATUSES[0]).label
  );
}

/** What the merchant usually does next for each status. */
export const NEXT_STEP: Partial<
  Record<OrderStatus, { to: OrderStatus; label: string }>
> = {
  new: { to: "confirmed", label: "تأكيد الطلب" },
  confirmed: { to: "shipped", label: "طلع للتوصيل" },
  shipped: { to: "delivered", label: "تم التوصيل" },
};

export function nextStep(status: OrderStatus, pickup = false) {
  const n = NEXT_STEP[status];
  if (!n || !pickup) return n;
  return {
    to: n.to,
    label:
      status === "confirmed"
        ? "الطلب جاهز للاستلام"
        : status === "shipped"
          ? "استلم الزبون طلبه"
          : n.label,
  };
}

export function StatusBadge({
  status,
  pickup,
}: {
  status: Order["status"];
  pickup?: boolean;
}) {
  const s = ORDER_STATUSES.find((x) => x.id === status) ?? ORDER_STATUSES[0];
  return (
    <span className={`badge ${s.className}`}>
      ● {statusLabel(s.id, pickup)}
    </span>
  );
}

export function PaymentBadge({
  status,
  method,
}: {
  status?: Order["payment_status"];
  method?: Order["payment_method"];
}) {
  const wallet = method && method !== "cod" ? WALLETS[method]?.short : null;
  if (status === "refunded")
    return <span className="badge bg-[#e3e3e3] text-[#616161]">↩ مسترجع</span>;
  if (status === "partially_refunded")
    return (
      <span className="badge bg-[#ffd6a4] text-[#5e4200]">↩ مسترجع جزئياً</span>
    );
  if (status === "paid")
    return (
      <span className="badge bg-[#e3e3e3] text-[#303030]">
        ● مدفوع{wallet ? ` (${wallet})` : ""}
      </span>
    );
  if (wallet)
    return (
      <span className="badge bg-[#d5ebff] text-[#003a5a]">
        ● بانتظار تحويل {wallet}
      </span>
    );
  return (
    <span className="badge bg-[#ffeb78] text-[#4f4700]">
      ● الدفع عند الاستلام
    </span>
  );
}
