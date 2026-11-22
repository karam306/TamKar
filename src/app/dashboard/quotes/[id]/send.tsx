"use client";

import { normalizeWhatsapp } from "@/lib/templates";

/** Opens WhatsApp with the quote link for the customer. */
export function SendQuote({ token, phone, number, storeName }: { token: string; phone: string; number: number; storeName: string }) {
  return (
    <button
      type="button"
      className="btn !bg-[#25D366]"
      onClick={() => {
        const text = `مرحباً، هذا عرض السعر رقم ${number} من ${storeName}:\n${window.location.origin}/q/${token}`;
        window.open(`https://wa.me/${normalizeWhatsapp(phone)}?text=${encodeURIComponent(text)}`, "_blank");
      }}
    >
      إرسال العرض عبر واتساب
    </button>
  );
}
