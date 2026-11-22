"use client";

import { useState, useTransition } from "react";
import { activateTelegram } from "@/app/admin/platform-actions";

/** Bot status and the one-time "activate" button. */
export function TelegramCard({ ready, bot, connected, total }: { ready: boolean; bot: string | null; connected: number; total: number }) {
  const [msg, setMsg] = useState<{ ok?: string; error?: string } | undefined>();
  const [pending, start] = useTransition();
  return (
    <section className="card space-y-2 p-4 text-[13px]">
      <h2 className="text-sm font-semibold">🔔 بوت تيليغرام لإشعارات الطلبات</h2>
      {!ready ? (
        <p className="text-muted">مو مجهّز. لازم تحط TELEGRAM_BOT_TOKEN بـ Vercel (Settings، Environment Variables) وتعمل Redeploy.</p>
      ) : !bot ? (
        <p className="text-red-700">في توكن بس تيليغرام ما قبله. تأكد إنك نسخته كامل من BotFather.</p>
      ) : (
        <>
          <p>
            البوت: <b dir="ltr">@{bot}</b> · {connected} من {total} متجر رابطين تيليغرام
          </p>
          <p className="text-muted">إذا هي أول مرة، أو غيّرت الدومين، اكبس الزر مرة وحدة ليصير البوت يستقبل الرسائل.</p>
          <button type="button" disabled={pending} onClick={() => start(async () => setMsg(await activateTelegram()))} className="btn">
            {pending ? "..." : "فعّل البوت على هالموقع"}
          </button>
          {msg && <p className={msg.ok ? "text-green-700" : "text-red-700"}>{msg.ok ?? msg.error}</p>}
        </>
      )}
    </section>
  );
}
