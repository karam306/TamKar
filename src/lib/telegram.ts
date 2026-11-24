import "server-only";
import { createHash } from "node:crypto";
import https from "node:https";
import { unstable_cache } from "next/cache";
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
/**
 * The token as pasted can carry extras (quotes, spaces, "bot" prefix, "TELEGRAM_BOT_TOKEN=",
 * or the whole BotFather message). Keep only the real token: digits, a colon, then the key.
 */
function cleanToken(raw?: string): string {
  const v = (raw ?? "").trim();
  const m = v.match(/\d{6,}:[A-Za-z0-9_-]{30,}/);
  return m ? m[0] : v.replace(/^["']|["']$/g, "");
}
const TOKEN = cleanToken(process.env.TELEGRAM_BOT_TOKEN);
export const telegramReady = () => Boolean(TOKEN);

/** Secret Telegram sends back with every update, so nobody else can post to our webhook. */
export const webhookSecret = () =>
  createHash("sha256").update(`nama-tg:${TOKEN}`).digest("hex").slice(0, 48);

/**
 * POST/GET to Telegram over IPv4 only. Vercel servers have no IPv6 route out, and Node's
 * fetch sometimes tries Telegram's IPv6 address first and hangs until it times out.
 */
function telegramCall(method: string, body?: Record<string, unknown>, timeoutMs = 10000): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : undefined;
    const req = https.request(
      {
        hostname: "api.telegram.org",
        path: `/bot${TOKEN}/${method}`,
        method: payload ? "POST" : "GET",
        family: 4,
        headers: payload ? { "content-type": "application/json", "content-length": Buffer.byteLength(payload) } : {},
        timeout: timeoutMs,
      },
      (res) => {
        let text = "";
        res.setEncoding("utf8");
        res.on("data", (c) => (text += c));
        res.on("end", () => resolve({ status: res.statusCode ?? 0, text }));
      },
    );
    req.on("timeout", () => req.destroy(new Error(`timeout after ${timeoutMs / 1000}s`)));
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

export async function tg<T = unknown>(method: string, body: Record<string, unknown>): Promise<{ ok: boolean; result?: T; description?: string }> {
  if (!TOKEN) return { ok: false, description: "TELEGRAM_BOT_TOKEN missing" };
  try {
    const { status, text } = await telegramCall(method, body);
    try {
      return JSON.parse(text);
    } catch {
      console.error("telegram non-JSON", method, status, text.slice(0, 200));
      return { ok: false, description: `network: HTTP ${status} ${text.slice(0, 80)}` };
    }
  } catch (e) {
    const err = e as Error & { code?: string };
    const detail = [err.message, err.code].filter(Boolean).join(" / ");
    console.error("telegram", method, detail);
    return { ok: false, description: `network: ${detail}` };
  }
}

type GetMe = { ok: boolean; result?: { username: string }; description?: string; parameters?: { retry_after?: number } };

/** Ask Telegram who the bot is (not cached). */
const getMe = () => tg<{ username: string }>("getMe", {}) as Promise<GetMe>;

/** Last refusal, so the admin card can explain it without asking Telegram a second time. */
let lastFailure: GetMe | null = null;

/**
 * The bot's name hardly ever changes, so it is asked once and kept for a day, shared by all
 * servers. Asking on every page view got the platform rate-limited ("Too Many Requests").
 * A failed answer throws, so it is never kept.
 */
const cachedBotName = unstable_cache(
  async (tokenId: string) => {
    void tokenId; // part of the cache key: a new token asks again
    const r = await getMe();
    if (!r.ok || !r.result) {
      lastFailure = r;
      throw new Error(r.description ?? "getMe failed");
    }
    return r.result.username;
  },
  ["telegram-bot-name"],
  { revalidate: 86400 },
);

export async function botUsername(): Promise<string | null> {
  if (!TOKEN) return null;
  try {
    lastFailure = null;
    return await cachedBotName(TOKEN.split(":")[0]);
  } catch {
    return null;
  }
}

/** Why Telegram refused the token, in words the owner can act on. */
export async function botProblem(): Promise<string | null> {
  if (!TOKEN) return null;
  if (!/^\d{6,}:[A-Za-z0-9_-]{30,}$/.test(TOKEN)) return "شكل الرمز غير صحيح. يجب أن يكون مثل 7123456789:AAH... بالكامل، دون أي إضافات.";
  const r = lastFailure ?? (await getMe());
  if (r.ok) return null;
  if (/too many requests/i.test(r.description ?? ""))
    return `الرمز صحيح، لكن تيليغرام طلب الانتظار ${r.parameters?.retry_after ?? 60} ثانية. حدّث الصفحة بعد دقيقة.`;
  if (r.description?.startsWith("network")) return `تعذّر الاتصال بخوادم تيليغرام من الموقع. التفاصيل التقنية: ${r.description.replace(/^network:\s*/, "")}`;
  if (/unauthorized|not found/i.test(r.description ?? "")) return "رفض تيليغرام الرمز (Unauthorized). الرمز غير صحيح أو أُلغي. اطلب رمزاً جديداً من BotFather.";
  return `رفض تيليغرام الرمز (${r.description ?? "سبب غير معروف"}).`;
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
