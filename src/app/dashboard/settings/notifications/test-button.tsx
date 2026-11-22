"use client";

import { useState, useTransition } from "react";
import { testTelegram } from "./actions";

export function TestButton() {
  const [msg, setMsg] = useState<{ ok?: string; error?: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center gap-2">
      <button type="button" disabled={pending} onClick={() => start(async () => setMsg(await testTelegram()))} className="btn">
        {pending ? "..." : "إرسال رسالة تجريبية"}
      </button>
      {msg && <span className={`text-sm ${msg.ok ? "text-green-700" : "text-red-700"}`}>{msg.ok ?? msg.error}</span>}
    </div>
  );
}
