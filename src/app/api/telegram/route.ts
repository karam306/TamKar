import { timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase";
import { sendTelegram, telegramReady, webhookSecret } from "@/lib/telegram";

export const dynamic = "force-dynamic";

type Update = { message?: { text?: string; chat?: { id: number; type?: string } } };

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** Telegram calls this for every message sent to the bot. */
export async function POST(req: Request) {
  if (!telegramReady() || !same(req.headers.get("x-telegram-bot-api-secret-token") ?? "", webhookSecret())) {
    return new Response("forbidden", { status: 403 });
  }
  const update = (await req.json().catch(() => ({}))) as Update;
  const text = update.message?.text?.trim() ?? "";
  const chatId = update.message?.chat?.id;
  if (!chatId) return Response.json({ ok: true });
  const chat = String(chatId);
  const admin = supabaseAdmin();

  const start = text.match(/^\/start\s+([a-f0-9]{24,64})$/i);
  if (start) {
    const { data } = await admin.from("store_admin").select("store_id, stores(name)").eq("telegram_token", start[1].toLowerCase()).maybeSingle();
    if (!data) {
      await sendTelegram(chat, "هالرابط انتهى أو انستخدم قبل. ارجع للوحة متجرك على نمى: الإعدادات، إشعارات تيليغرام، واكبس اربط مرة تانية.");
    } else {
      await admin.from("store_admin").update({ telegram_chat_id: chat, telegram_token: null }).eq("store_id", data.store_id);
      const name = (data as unknown as { stores?: { name?: string } }).stores?.name ?? "متجرك";
      await sendTelegram(chat, `✅ تم ربط ${name}.\nمن هلق كل طلب جديد رح يوصلك هون فوراً.\n\nلتوقف الإشعارات ابعت /stop`);
    }
    return Response.json({ ok: true });
  }

  if (/^\/stop\b/.test(text)) {
    const { data } = await admin.from("store_admin").update({ telegram_chat_id: null }).eq("telegram_chat_id", chat).select("store_id");
    await sendTelegram(chat, data?.length ? "تمام، وقفنا إشعارات الطلبات. فيك ترجع تربطها من لوحة متجرك." : "هالمحادثة مو مربوطة بأي متجر.");
    return Response.json({ ok: true });
  }

  await sendTelegram(chat, "أهلاً 👋 هاد بوت إشعارات نمى.\nلتربط متجرك: افتح لوحة المتجر، الإعدادات، إشعارات تيليغرام، واكبس اربط.");
  return Response.json({ ok: true });
}
