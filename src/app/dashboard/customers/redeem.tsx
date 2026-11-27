"use client";

import { useState, useTransition } from "react";
import { redeemPoints } from "./loyalty-actions";

export function RedeemPoints({
  customerId,
  phone,
  name,
  store,
  unit,
}: {
  customerId: string;
  phone: string;
  name: string;
  store: string;
  unit: string;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ link?: string; text: string } | null>(null);
  return (
    <div className="space-y-2">
      <button
        type="button"
        className="btn w-full"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await redeemPoints(customerId);
            if ("error" in r) return setMsg({ text: r.error });
            const amount = unit === "$" ? `$${r.amount}` : `${r.amount.toLocaleString("en-US")} ل.س`;
            const text = [
              `مرحباً ${name}،`,
              `شكراً لأنك من زبائن ${store}. جمعت ${r.used} نقطة، وأصبح لك خصم بقيمة ${amount}.`,
              `استخدم الكود ${r.code} في طلبك القادم، من المتجر أو في المحل. صالح حتى ${r.until}.`,
            ].join("\n");
            setMsg({ text: `أُنشئ الكود ${r.code} بقيمة ${amount}.`, link: `https://wa.me/${phone}?text=${encodeURIComponent(text)}` });
          })
        }
      >
        {pending ? "..." : "تحويل النقاط إلى كود خصم"}
      </button>
      {msg && (
        <div className="space-y-2 text-[13px]">
          <p>{msg.text}</p>
          {msg.link && (
            <a href={msg.link} target="_blank" rel="noopener noreferrer" className="btn btn-outline w-full !border-[#25D366] !text-[#128C4B]">
              إرسال الكود للزبون عبر واتساب
            </a>
          )}
        </div>
      )}
    </div>
  );
}
