"use client";

import { useState, useTransition } from "react";
import { createKey } from "./actions";

export function NewKey() {
  const [label, setLabel] = useState("Claude");
  const [key, setKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  if (key)
    return (
      <div className="space-y-2 rounded-lg border border-[#e8a33c] bg-[#fff8ec] p-4 text-[13px]">
        <p className="font-semibold">انسخ المفتاح الآن. لن يظهر مرة أخرى.</p>
        <code dir="ltr" className="block break-all rounded bg-white p-2 text-[13px]">
          Bearer {key}
        </code>
        <button
          type="button"
          className="btn !py-1.5 text-[13px]"
          onClick={() => {
            navigator.clipboard.writeText(`Bearer ${key}`);
            setCopied(true);
          }}
        >
          {copied ? "✓ نُسخ" : "نسخ"}
        </button>
        <p className="text-muted">لا تُرسله في أي محادثة أو رسالة. ضعه فقط في إعدادات الموصّل في Claude.</p>
      </div>
    );
  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="text-[13px]">
        <span className="mb-1 block font-semibold">اسم المفتاح</span>
        <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={60} />
      </label>
      <button
        type="button"
        className="btn"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await createKey(label);
            if (r.key) setKey(r.key);
            else setError(r.error ?? "");
          })
        }
      >
        {pending ? "..." : "إنشاء مفتاح"}
      </button>
      {error && <p className="w-full text-[13px] text-red-700">{error}</p>}
    </div>
  );
}
