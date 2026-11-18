import type { Order } from "@/lib/types";

export const ORDER_STATUSES: { id: Order["status"]; label: string; className: string }[] = [
  { id: "new", label: "جديد", className: "bg-amber-100 text-amber-800" },
  { id: "confirmed", label: "مؤكد", className: "bg-blue-100 text-blue-800" },
  { id: "delivered", label: "تم التوصيل", className: "bg-green-100 text-green-800" },
  { id: "cancelled", label: "ملغي", className: "bg-gray-100 text-gray-600" },
];

export function StatusBadge({ status }: { status: Order["status"] }) {
  const s = ORDER_STATUSES.find((x) => x.id === status) ?? ORDER_STATUSES[0];
  return <span className={`rounded-full px-2.5 py-0.5 text-xs ${s.className}`}>{s.label}</span>;
}
