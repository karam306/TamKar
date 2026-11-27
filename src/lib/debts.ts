/** Debt ledger: orders sold on credit, paid later in parts. */
export type OrderPayment = {
  id: string;
  order_id: string;
  amount: number;
  note: string | null;
  created_at: string;
};

/** What is still owed on an order after refunds and payments. Never below zero. */
export function orderDue(
  o: { total: number | string; refunded?: number | string | null },
  payments: { amount: number | string }[],
): { paid: number; due: number } {
  const paid = payments.reduce((s, p) => s + Number(p.amount), 0);
  const due = Math.max(0, Math.round((Number(o.total) - Number(o.refunded ?? 0) - paid) * 100) / 100);
  return { paid: Math.round(paid * 100) / 100, due };
}

/** A polite reminder in formal Arabic, ready for WhatsApp. */
export function reminderText(customer: string, store: string, due: string): string {
  return [
    `مرحباً ${customer}،`,
    `نذكّركم بلطف بأن المبلغ المتبقي على طلباتكم من ${store} هو ${due}.`,
    "يمكنكم السداد في زيارتكم القادمة أو بالتحويل، ونحن في خدمتكم لأي استفسار.",
    "شكراً لثقتكم.",
  ].join("\n");
}
