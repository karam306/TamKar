import { formatPrice } from "@/lib/format";
import type { Currency, Discount } from "@/lib/types";

export function describeDiscount(d: Discount, currency: Currency): string {
  const what = d.kind === "percent" ? `خصم ${Number(d.value)}%` : d.kind === "fixed" ? `خصم ${formatPrice(Number(d.value), currency)}` : "توصيل مجاني";
  const min = d.min_subtotal ? ` على الطلبات من ${formatPrice(Number(d.min_subtotal), currency)}` : "";
  return what + min;
}

export function discountState(d: Discount): { label: string; className: string } {
  const now = Date.now();
  if (!d.active) return { label: "متوقف", className: "bg-[#e3e3e3] text-[#616161]" };
  if (d.starts_at && new Date(d.starts_at).getTime() > now) return { label: "مجدول", className: "bg-[#e0f0ff] text-[#00527c]" };
  if ((d.ends_at && new Date(d.ends_at).getTime() <= now) || (d.usage_limit && d.used_count >= d.usage_limit))
    return { label: "منتهي", className: "bg-[#e3e3e3] text-[#616161]" };
  return { label: "فعّال", className: "bg-[#affebf] text-[#014b40]" };
}
