"use client";

import { useState } from "react";
import { normalizeWhatsapp } from "@/lib/templates";
import { invoiceLink } from "./actions";

/** Sends the customer a link to their invoice on WhatsApp. */
export function ShareInvoice({ orderId, phone, number, storeName }: { orderId: string; phone: string; number: number; storeName: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      className="btn !bg-[#25D366]"
      onClick={async () => {
        // Open the window first so phones don't block it, then fill in the link.
        const w = window.open("", "_blank");
        setBusy(true);
        const url = await invoiceLink(orderId);
        setBusy(false);
        if (!url) return w?.close();
        const text = `مرحباً، هذه فاتورة طلبك رقم #${number} من ${storeName}:\n${window.location.origin}${url}`;
        const wa = `https://wa.me/${normalizeWhatsapp(phone)}?text=${encodeURIComponent(text)}`;
        if (w) w.location.href = wa;
        else window.location.href = wa;
      }}
    >
      {busy ? "..." : "إرسال الفاتورة إلى الزبون عبر واتساب"}
    </button>
  );
}
