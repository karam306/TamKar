"use server";

import { after } from "next/server";
import { eventContext, sendPurchaseEvent } from "@/lib/meta";
import { createOrder, getProductsByIds, getStore, isDemoStore, quote } from "@/lib/data";
import { whatsappOrderLink } from "@/lib/format";
import { liveFx, money } from "@/lib/fx";
import { supabaseAdmin } from "@/lib/supabase";
import { normalizeWhatsapp } from "@/lib/templates";
import { offerPrice, type QtyOffer } from "@/lib/offers";
import { isOpen } from "@/lib/subscription";
import { storeWallets } from "@/lib/wallets";
import { notifyNewOrder } from "@/lib/telegram";
import { platformOrigin } from "@/lib/site-origin";
import type {
  CartItem,
  Currency,
  Fulfillment,
  OrderInput,
  Pricing,
  WalletId,
} from "@/lib/types";

export type PlaceOrderResult =
  | {
      ok: true;
      id: string;
      number: number;
      total: number;
      /** What the customer transfers: in pounds when the store uses an exchange rate. */
      payAmount: number;
      payCurrency: Currency;
      whatsappUrl: string;
      items: { productId: string; qty: number; price: number }[];
      /** Set when the customer chose to pay by e-wallet transfer: what to show them. */
      wallet?: {
        id: WalletId;
        account: string;
        holder: string | null;
        qr: string | null;
      } | null;
    }
  | { ok: false; error: string };

export async function placeOrder(
  site: string,
  input: OrderInput,
): Promise<PlaceOrderResult> {
  const store = await getStore(site);
  if (!store) return { ok: false, error: "المتجر غير موجود" };
  if (!isOpen(store)) return { ok: false, error: "المتجر متوقف مؤقتاً" };
  const result = await createOrder(
    store,
    {
      name: input.customerName,
      phone: input.phone,
      city: input.city,
      address: input.address,
      notes: input.notes,
      method: input.method,
      branch: input.branch,
      payment: input.payment,
      gift: input.gift ?? null,
    },
    input.items,
    "online",
    input.discountCode,
  );
  if (!result.ok) return result;
  const o = result.order;
  if (o.id !== "demo") {
    // The cart is no longer abandoned (update 015).
    await supabaseAdmin()
      .from("abandoned_carts")
      .update({ recovered_order_id: o.id, updated_at: new Date().toISOString() })
      .eq("store_id", store.id)
      .eq("phone", normalizeWhatsapp(input.phone))
      .is("recovered_order_id", null);
  }
  if (o.id !== "demo") {
    // Order confirmation (update 015): "pending" until the customer opens WhatsApp with the order.
    const { error: waError } = await supabaseAdmin().from("orders").update({ wa_status: "pending" }).eq("id", o.id);
    if (waError) console.error("wa_status not saved (run 015)", waError.message);
  }
  const ctx = await eventContext();
  after(() => sendPurchaseEvent(store, o, ctx));
  if (o.id !== "demo") {
    const origin = await platformOrigin();
    after(() => notifyNewOrder(store, o, origin));
  }
  return {
    ok: true,
    id: o.id,
    number: o.number,
    total: o.total,
    ...(() => {
      const m = money(store.currency, liveFx(store));
      return { payAmount: m.totals(o.items, o.discount, o.shipping).total, payCurrency: m.cur };
    })(),
    whatsappUrl: whatsappOrderLink(store, o),
    items: o.items.map((i) => ({
      productId: i.productId,
      qty: i.qty,
      price: i.price,
    })),
    wallet: (() => {
      const w =
        o.payment_method === "cod"
          ? null
          : storeWallets(store).find((x) => x.id === o.payment_method);
      return w
        ? {
            id: w.id,
            account: w.account,
            holder: w.holder ?? null,
            qr: w.qr ?? null,
          }
        : null;
    })(),
  };
}

export type CartLine = {
  productId: string;
  variantId?: string;
  title: string;
  variantTitle?: string;
  price: number;
  image: string;
  available: boolean;
  /** Quantity offers of the product (all its variants count together). */
  offers?: QtyOffer[];
};

/** Current price and details for what is in the cart. */
export async function getCartLines(
  site: string,
  items: CartItem[],
): Promise<CartLine[]> {
  const store = await getStore(site);
  if (!store || !Array.isArray(items)) return [];
  const products = await getProductsByIds(
    store.id,
    items.map((i) => String(i.productId)),
  );
  return items.flatMap((i) => {
    const p = products.find((x) => x.id === i.productId);
    if (!p) return [];
    const v = p.variants?.find((x) => x.id === i.variantId);
    if ((p.variants?.length ?? 0) > 0 && !v) return [];
    return [
      {
        productId: p.id,
        variantId: v?.id,
        title: p.title,
        variantTitle: v?.title,
        price: v ? Number(v.price) : p.price,
        image: p.images[0] ?? "",
        available: v ? v.stock !== 0 : p.stock !== 0,
        offers: p.qty_prices ?? [],
      },
    ];
  });
}

/** Subtotal, discount, delivery fee and total for the cart page. */
export async function quoteCart(
  site: string,
  items: CartItem[],
  city: string,
  code?: string,
  method: Fulfillment = "pickup",
): Promise<Pricing | { error: string }> {
  const store = await getStore(site);
  if (!store) return { error: "المتجر غير موجود" };
  const lines = await getCartLines(site, items);
  // Same as the database: quantity offers count all variants of a product together.
  const perProduct = new Map<string, number>();
  for (const i of items) perProduct.set(String(i.productId), (perProduct.get(String(i.productId)) ?? 0) + Number(i.qty || 0));
  const subtotal = lines.reduce(
    (s, l) =>
      s +
      offerPrice(l.price, l.offers, perProduct.get(l.productId) ?? 0) *
        (items.find(
          (i) =>
            i.productId === l.productId &&
            (i.variantId ?? "") === (l.variantId ?? ""),
        )?.qty ?? 0),
    0,
  );
  return quote(store, Math.round(subtotal * 100) / 100, city, code, method);
}

/** The customer opened WhatsApp with their order: it no longer needs a confirmation message. */
export async function markWhatsappSent(site: string, orderId: string): Promise<void> {
  if (!/^[0-9a-f-]{36}$/.test(orderId)) return;
  const store = await getStore(site);
  if (!store) return;
  await supabaseAdmin()
    .from("orders")
    .update({ wa_status: "sent" })
    .eq("id", orderId)
    .eq("store_id", store.id)
    .eq("wa_status", "pending");
}

/**
 * Abandoned carts (update 015): the customer typed a phone number at checkout.
 * Saved per phone; when they order, it is marked recovered. Never fails the page.
 */
export async function saveCartDraft(site: string, input: { name?: string; phone?: string; items: CartItem[] }): Promise<void> {
  try {
    const phone = normalizeWhatsapp(String(input.phone ?? "")).slice(0, 15);
    if (!/^\d{9,15}$/.test(phone) || !Array.isArray(input.items) || !input.items.length) return;
    const store = await getStore(site);
    if (!store || isDemoStore(store.id)) return;
    // Flood guard: at most 300 saved carts per store per hour.
    const { count } = await supabaseAdmin()
      .from("abandoned_carts")
      .select("id", { count: "exact", head: true })
      .eq("store_id", store.id)
      .gte("updated_at", new Date(Date.now() - 3600_000).toISOString());
    if ((count ?? 0) >= 300) return;
    const items = input.items.slice(0, 50);
    const lines = await getCartLines(site, items);
    if (!lines.length) return;
    const saved = lines.map((l) => ({
      productId: l.productId,
      variantId: l.variantId ?? null,
      title: l.variantTitle ? `${l.title} (${l.variantTitle})` : l.title,
      price: l.price,
      qty: Math.min(999, Math.max(1, Math.floor(Number(items.find((i) => i.productId === l.productId && (i.variantId ?? "") === (l.variantId ?? ""))?.qty) || 1))),
    }));
    const subtotal = Math.round(saved.reduce((s, l) => s + l.price * l.qty, 0) * 100) / 100;
    await supabaseAdmin().from("abandoned_carts").upsert(
      {
        store_id: store.id,
        phone,
        name: String(input.name ?? "").trim().slice(0, 80) || null,
        items: saved,
        subtotal,
        recovered_order_id: null,
        reminded_at: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "store_id,phone" },
    );
  } catch (e) {
    console.error("saveCartDraft", e);
  }
}
