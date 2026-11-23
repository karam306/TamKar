"use client";

import { useActionState, useState } from "react";
import { FormMessage, SubmitButton } from "@/components/form-ui";
import { addSalesman } from "@/app/admin/platform-actions";

export function AddSalesmanForm() {
  const [state, action] = useActionState(addSalesman, undefined);
  return (
    <form action={action} className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-3">
        <input name="name" required placeholder="الاسم" className="input" />
        <input name="phone" placeholder="رقم الواتساب (اختياري)" className="input" dir="ltr" />
        <input name="code" placeholder="الرمز (اختياري، مثلاً: SAMER)" className="input font-mono uppercase" dir="ltr" maxLength={12} />
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingText="...">إضافة</SubmitButton>
    </form>
  );
}

/** The salesman's personal signup link: stores that sign up through it are counted for him. */
export function CopyRef({ link, phone }: { link: string; phone: string | null }) {
  const [copied, setCopied] = useState(false);
  const text = `هذا رابطك الخاص لتسجيل المتاجر على منصة كُن. يُحتسب لك كل متجر يسجّل من خلاله:\n${link}`;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg bg-[#f7f7f7] p-2 text-[13px]">
      <span className="min-w-0 flex-1 truncate font-mono" dir="ltr">
        {link}
      </span>
      <button
        type="button"
        className="btn btn-outline !px-3 !py-1 text-xs"
        onClick={async () => {
          await navigator.clipboard.writeText(link).catch(() => {});
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? "✓" : "نسخ"}
      </button>
      {phone && (
        <a href={`https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer" className="btn !bg-[#25D366] !px-3 !py-1 text-xs">
          إرسال
        </a>
      )}
    </div>
  );
}
