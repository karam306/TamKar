"use server";

import { after } from "next/server";
import { eventContext, sendPurchaseEvent } from "@/lib/meta";
import { createOrder, getProductsByIds, getStore, quote } from "@/lib/data";
import { whatsappOrderLink } from "@/lib/format";
import { isOpen } from "@/lib/subscription";
import type { CartItem, Fulfillment, OrderInput, Pricing } from "@/lib/types";

export type PlaceOrderResult =
  | { ok: true; id: string; number: number; total: number; whatsappUrl: string; items: { productId: string; qty: number; price: number }[] }
  | { ok: false; error: string };

export async function placeOrder(site: string, input: OrderInput): Promise<PlaceOrderResult> {
  const store = await getStore(site);
  if (!store) return { ok: false, error: "المتجر غير موجود" };
  if (!isOpen(store)) return { ok: false, error: "المتجر متوقف مؤقتاً" };
  const result = await createOrder(
    store,
    { name: input.customerName, phone: input.phone, city: input.city, address: input.address, notes: input.notes, method: input.method, branch: input.branch },
    input.items,
    "online",
    input.discountCode,
  );
  if (!result.ok) return result;
  const o = result.order;
  const ctx = await eventContext();
  after(() => sendPurchaseEvent(store, o, ctx));
  return {
    ok: true,
    id: o.id,
    number: o.number,
    total: o.total,
    whatsappUrl: whatsappOrderLink(store, o),
    items: o.items.map((i) => ({ productId: i.productId, qty: i.qty, price: i.price })),
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
};

/** Current price and details for what is in the cart. */
export async function getCartLines(site: string, items: CartItem[]): Promise<CartLine[]> {
  const store = await getStore(site);
  if (!store || !Array.isArray(items)) return [];
  const products = await getProductsByIds(store.id, items.map((i) => String(i.productId)));
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
      },
    ];
  });
}

/** Subtotal, discount, delivery fee and total for the cart page. */
export async function quoteCart(site: string, items: CartItem[], city: string, code?: string, method: Fulfillment = "pickup"): Promise<Pricing | { error: string }> {
  const store = await getStore(site);
  if (!store) return { error: "المتجر غير موجود" };
  const lines = await getCartLines(site, items);
  const subtotal = lines.reduce((s, l) => s + l.price * (items.find((i) => i.productId === l.productId && (i.variantId ?? "") === (l.variantId ?? ""))?.qty ?? 0), 0);
  return quote(store, Math.round(subtotal * 100) / 100, city, code, method);
}
