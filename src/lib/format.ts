import type {
  Currency,
  GiftInfo,
  OrderLine,
  PaymentMethod,
  Store,
} from "./types";
import { liveFx, money } from "./fx";
import { WALLETS } from "./wallets";

export function formatPrice(amount: number, currency: Currency): string {
  if (currency === "SYP") {
    return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(amount)} ل.س`;
  }
  return `$${new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount)}`;
}

/** Order summary message the customer sends to the merchant on WhatsApp. */
export function whatsappOrderLink(
  store: Pick<Store, "whatsapp" | "name" | "currency"> & {
    shipping?: Store["shipping"];
  },
  order: {
    number: number;
    customer_name: string;
    phone: string;
    city: string | null;
    address: string | null;
    notes?: string | null;
    fulfillment?: "pickup" | "delivery";
    branch?: { name: string; note?: string | null; whatsapp: string } | null;
    items: OrderLine[];
    total: number;
    discount?: number;
    shipping?: number;
    discount_code?: string | null;
    payment_method?: PaymentMethod | null;
    gift?: GiftInfo | null;
  },
): string {
  const wallet =
    order.payment_method && order.payment_method !== "cod"
      ? WALLETS[order.payment_method]
      : null;
  // With an exchange rate the message is in pounds, line by line, like the cart.
  const fx = liveFx(store);
  const m = money(store.currency, fx);
  const t = m.totals(order.items, order.discount ?? 0, order.shipping ?? 0);
  const lines = [
    `طلب جديد رقم #${order.number} من متجر ${store.name}`,
    "",
    ...order.items.map(
      (i) =>
        `• ${i.title}${i.variantTitle ? ` (${i.variantTitle})` : ""} × ${i.qty} = ${m.text(m.unit(i.price) * i.qty)}${i.offer ? ` (عرض الكمية: خصم ${i.offer}٪)` : ""}`,
    ),
    "",
    order.discount
      ? `الخصم${order.discount_code ? ` (${order.discount_code})` : ""}: -${m.text(t.discount)}`
      : "",
    order.fulfillment === "pickup"
      ? "طريقة الاستلام: من المحل"
      : order.shipping != null
        ? `التوصيل: ${order.shipping ? m.text(t.shipping) : "مجاني"}`
        : "",
    `المجموع: ${m.text(t.total, order.total)}`,
    fx ? `سعر الصرف المعتمد: ${fx.rate} ل.س للدولار` : "",
    wallet
      ? `الدفع: ${wallet.name}. سأرسل لكم صورة إيصال التحويل`
      : "الدفع: عند الاستلام",
    "",
    `الاسم: ${order.customer_name}`,
    `الهاتف: ${order.phone}`,
    order.fulfillment === "pickup"
      ? order.branch
        ? `مكان الاستلام: ${order.branch.name}${order.branch.note ? `، ${order.branch.note}` : ""}`
        : store.shipping?.pickup_note
          ? `مكان الاستلام: ${store.shipping.pickup_note}`
          : ""
      : `العنوان: ${order.city}، ${order.address}`,
    ...giftLines(order.gift),
    order.notes ? `ملاحظات: ${order.notes}` : "",
  ].filter((l, i, a) => !(l === "" && a[i - 1] === ""));
  return `https://wa.me/${order.branch?.whatsapp || store.whatsapp}?text=${encodeURIComponent(lines.join("\n").trim())}`;
}

/** The gift part of an order message (WhatsApp and Telegram). */
export function giftLines(g?: GiftInfo | null): string[] {
  if (!g) return [];
  return [
    "",
    "🎁 هدية",
    `المستلم: ${g.to_name}${g.to_phone ? ` (${g.to_phone})` : ""}`,
    g.message ? `رسالة البطاقة: ${g.message}` : "",
    g.hide_prices ? "دون فاتورة أو أسعار مع الهدية" : "",
  ].filter(Boolean);
}

export function whatsappLink(phone: string, text?: string): string {
  return `https://wa.me/${phone}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
