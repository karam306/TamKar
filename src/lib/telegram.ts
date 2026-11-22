import "server-only";
import { createHash } from "node:crypto";
import { supabaseAdmin } from "./supabase";
import { formatPrice, giftLines } from "./format";
import type {
  Currency,
  GiftInfo,
  OrderLine,
  PaymentMethod,
  Store,
} from "./types";
import { paymentLabel } from "./wallets";

/**
 * One Telegram bot for the whole platform. Karam creates it with BotFather and puts its
 * token in Vercel as TELEGRAM_BOT_TOKEN. Each merchant connects their own chat to it.
 */
const TOKEN = process.env.TELEGRAM_BOT_TOKEN?.trim() || "";
export const telegramReady = () => Boolean(TOKEN);

/** Secret Telegram sends back with every update, so nobody else can post to our webhook. */
export const webhookSecret = () =>
  createHash("sha256").update(`nama-tg:${TOKEN}`).digest("hex").slice(0, 48);

export async function tg<T = unknown>(
  method: string,
  body: Record<string, unknown>,
): Promise<{ ok: boolean; result?: T; description?: string }> {
  if (!TOKEN) return { ok: false, description: "TELEGRAM_BOT_TOKEN missing" };
  try {
    const res = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    return await res.json();
  } catch (e) {
    console.error("telegram", method, e instanceof Error ? e.message : e);
    return { ok: false, description: "network" };
  }
}

let username: string | null = null;
export async function botUsername(): Promise<string | null> {
  if (username) return username;
  const r = await tg<{ username: string }>("getMe", {});
  username = r.ok && r.result ? r.result.username : null;
  return username;
}

export const sendTelegram = (
  chatId: string,
  text: string,
  link?: { text: string; url: string },
) =>
  tg("sendMessage", {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
    ...(link && /^https:\/\//.test(link.url)
      ? {
          reply_markup: {
            inline_keyboard: [[{ text: link.text, url: link.url }]],
          },
        }
      : {}),
  });

/** Chat id the store owner connected, if any. */
export async function storeChat(storeId: string): Promise<string | null> {
  if (!TOKEN) return null;
  const { data } = await supabaseAdmin()
    .from("store_admin")
    .select("telegram_chat_id")
    .eq("store_id", storeId)
    .maybeSingle();
  return (data?.telegram_chat_id as string | null) ?? null;
}

/** New-order alert for the merchant. Never throws: an order must not fail because of Telegram. */
export async function notifyNewOrder(
  store: Pick<Store, "id" | "name" | "currency">,
  o: {
    id: string;
    number: number;
    total: number;
    items: OrderLine[];
    customer_name: string;
    phone: string;
    fulfillment: "pickup" | "delivery";
    city?: string | null;
    address?: string | null;
    notes?: string | null;
    branch?: { name: string } | null;
    payment_method?: PaymentMethod | null;
    gift?: GiftInfo | null;
  },
  dashboardOrigin: string,
) {
  try {
    const chat = await storeChat(store.id);
    if (!chat) return;
    const cur = store.currency as Currency;
    const pickup = o.fulfillment === "pickup";
    const lines = [
      `🛍 طلب جديد #${o.number} في ${store.name}`,
      "",
      ...o.items.map(
        (i) =>
          `• ${i.title}${i.variantTitle ? ` (${i.variantTitle})` : ""} × ${i.qty}`,
      ),
      "",
      `المجموع: ${formatPrice(o.total, cur)}`,
      pickup
        ? `🏪 الاستلام من المحل${o.branch ? `: ${o.branch.name}` : ""}`
        : `🚚 التوصيل: ${o.city ?? ""}، ${o.address ?? ""}`,
      `الدفع: ${paymentLabel(o.payment_method, pickup)}${o.payment_method && o.payment_method !== "cod" ? " (تحقّق من وصول التحويل)" : ""}`,
      "",
      `👤 ${o.customer_name}`,
      `📞 ${o.phone}`,
      ...giftLines(o.gift),
      o.notes ? `📝 ${o.notes}` : "",
    ].filter((l, i, a) => !(l === "" && a[i - 1] === ""));
    await sendTelegram(chat, lines.join("\n").trim(), {
      text: "افتح الطلب",
      url: `${dashboardOrigin}/dashboard/orders/${o.id}`,
    });
  } catch (e) {
    console.error("notifyNewOrder", e);
  }
}
