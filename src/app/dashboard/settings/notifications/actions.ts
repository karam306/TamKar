"use server";

import { randomBytes } from "node:crypto";
import { refresh, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOwner } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { botUsername, sendTelegram, storeChat } from "@/lib/telegram";

/** Makes a one-time link that opens the bot; pressing Start connects this store's alerts to that chat. */
export async function connectTelegram() {
  const { store } = await requireOwner();
  const bot = await botUsername();
  if (!bot) redirect("/dashboard/settings/notifications?err=bot");
  const token = randomBytes(16).toString("hex");
  const { error } = await supabaseAdmin().from("store_admin").upsert({ store_id: store.id, telegram_token: token }, { onConflict: "store_id" });
  if (error) {
    console.error("connectTelegram", error.message);
    redirect("/dashboard/settings/notifications?err=db");
  }
  redirect(`https://t.me/${bot}?start=${token}`);
}

export async function disconnectTelegram() {
  const { store } = await requireOwner();
  await supabaseAdmin().from("store_admin").update({ telegram_chat_id: null, telegram_token: null }).eq("store_id", store.id);
  revalidatePath("/dashboard/settings/notifications");
  refresh();
}

export async function testTelegram(): Promise<{ ok?: string; error?: string }> {
  const { store } = await requireOwner();
  const chat = await storeChat(store.id);
  if (!chat) return { error: "تيليغرام غير مرتبط" };
  const r = await sendTelegram(chat, `🔔 رسالة تجريبية من ${store.name}. الإشعارات تعمل.`);
  return r.ok ? { ok: "✓ أُرسلت، تحقق من تيليغرام" } : { error: "لم تصل الرسالة. ربما أوقفت البوت؟ حاول الربط من جديد." };
}
