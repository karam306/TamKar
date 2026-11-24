"use client";

import { useState, useTransition } from "react";
import { activateTelegram } from "@/app/admin/platform-actions";

/** Bot status and the one-time "activate" button. */
export function TelegramCard({ ready, bot, problem, connected, total }: { ready: boolean; bot: string | null; problem?: string | null; connected: number; total: number }) {
  const [msg, setMsg] = useState<{ ok?: string; error?: string } | undefined>();
  const [pending, start] = useTransition();
  return (
    <section className="card space-y-2 p-4 text-[13px]">
      <h2 className="text-sm font-semibold">🔔 بوت تيليغرام لإشعارات الطلبات</h2>
      {!ready ? (
        <p className="text-muted">غير مُعَدّ. يجب إضافة TELEGRAM_BOT_TOKEN في Vercel (Settings، ثم Environment Variables) ثم تنفيذ Redeploy.</p>
      ) : !bot ? (
        <div className="space-y-1">
          <p className="text-red-700">يوجد رمز لكن تيليغرام لم يقبله.</p>
          {problem && <p className="text-red-700">السبب: {problem}</p>}
        </div>
      ) : (
        <>
          <p>
            البوت: <b dir="ltr">@{bot}</b> · {connected} من {total} متجر ربطت تيليغرام
          </p>
          <p className="text-muted">إذا كانت هذه المرة الأولى، أو غيّرت النطاق، فاضغط الزر مرة واحدة ليبدأ البوت باستقبال الرسائل.</p>
          <button type="button" disabled={pending} onClick={() => start(async () => setMsg(await activateTelegram()))} className="btn">
            {pending ? "..." : "تفعيل البوت على هذا الموقع"}
          </button>
          {msg && <p className={msg.ok ? "text-green-700" : "text-red-700"}>{msg.ok ?? msg.error}</p>}
        </>
      )}
    </section>
  );
}
