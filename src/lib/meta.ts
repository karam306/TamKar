import "server-only";
import { createHash } from "node:crypto";
import { cookies, headers } from "next/headers";
import { isDemoStore } from "./data";
import { contentId } from "./product-utils";
import { hasSupabase, supabaseAdmin } from "./supabase";
import { normalizeWhatsapp } from "./templates";
import type { OrderLine, Store } from "./types";
import { storePixel } from "./meta-managed";

// Meta Conversions API: sends the same events as the browser Pixel, but from our
// server, so ad blockers and iOS privacy settings don't hide sales from Meta.

const GRAPH = "https://graph.facebook.com/v21.0";
const sha = (v: string) => createHash("sha256").update(v.trim().toLowerCase()).digest("hex");

export type EventContext = { ip?: string; ua?: string; url?: string; fbp?: string; fbc?: string };

/** Browser details Meta uses to match the event to a person. Call during the request. */
export async function eventContext(): Promise<EventContext> {
  const h = await headers();
  const c = await cookies();
  return {
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined,
    ua: h.get("user-agent") || undefined,
    url: h.get("referer") || undefined,
    fbp: c.get("_fbp")?.value,
    fbc: c.get("_fbc")?.value,
  };
}

async function credentials(storeId: string): Promise<{ pixel: string; token: string } | null> {
  if (!hasSupabase || isDemoStore(storeId)) return null;
  const { data } = await supabaseAdmin().from("stores").select("id, meta_pixel_id, meta_capi_token, plan, paid_until").eq("id", storeId).maybeSingle();
  if (!data) return null;
  // Either the Kun-managed pixel (when on) or the merchant's own pixel and token.
  const p = await storePixel(data);
  return p?.token ? { pixel: p.pixel, token: p.token } : null;
}

async function send(storeId: string, event: Record<string, unknown>) {
  const cred = await credentials(storeId);
  if (!cred) return;
  try {
    const res = await fetch(`${GRAPH}/${cred.pixel}/events?access_token=${encodeURIComponent(cred.token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: [event] }),
    });
    if (!res.ok) console.error("meta capi", res.status, (await res.text()).slice(0, 300));
  } catch (e) {
    console.error("meta capi failed", e);
  }
}

function userData(order: { phone: string; customer_name: string }, ctx?: EventContext) {
  const phone = normalizeWhatsapp(order.phone);
  return {
    ph: phone ? [sha(phone)] : undefined,
    external_id: phone ? [sha(phone)] : undefined,
    fn: [sha(order.customer_name.split(" ")[0] ?? "")],
    country: [sha("sy")],
    client_ip_address: ctx?.ip,
    client_user_agent: ctx?.ua,
    fbp: ctx?.fbp,
    fbc: ctx?.fbc,
  };
}

type OrderLike = { id: string; number: number; total: number; phone: string; customer_name: string; items: OrderLine[] };

/** Purchase, sent when the order is placed. event_id matches the browser Pixel event to avoid double counting. */
export async function sendPurchaseEvent(store: Pick<Store, "id" | "currency">, order: OrderLike, ctx: EventContext) {
  await send(store.id, {
    event_name: "Purchase",
    event_time: Math.floor(Date.now() / 1000),
    event_id: order.id,
    action_source: "website",
    event_source_url: ctx.url,
    user_data: userData(order, ctx),
    custom_data: {
      currency: store.currency,
      value: order.total,
      order_id: String(order.number),
      content_type: "product",
      content_ids: order.items.map((i) => contentId(i.productId, i.variantId)),
      contents: order.items.map((i) => ({ id: contentId(i.productId, i.variantId), quantity: i.qty, item_price: i.price })),
      num_items: order.items.reduce((s, i) => s + i.qty, 0),
    },
  });
}

/** Custom event when a cash-on-delivery order is actually delivered (real revenue). */
export async function sendDeliveredEvent(store: Pick<Store, "id" | "currency">, order: OrderLike) {
  await send(store.id, {
    event_name: "OrderDelivered",
    event_time: Math.floor(Date.now() / 1000),
    event_id: `delivered-${order.id}`,
    action_source: "system_generated",
    user_data: userData(order),
    custom_data: { currency: store.currency, value: order.total, order_id: String(order.number) },
  });
}
