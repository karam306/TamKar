"use server";

import { createOrder, getProductsByIds, getStore } from "@/lib/data";
import { whatsappOrderLink } from "@/lib/format";
import type { CartItem, OrderInput } from "@/lib/types";

export type PlaceOrderResult = { ok: true; number: number; whatsappUrl: string } | { ok: false; error: string };

export async function placeOrder(site: string, input: OrderInput): Promise<PlaceOrderResult> {
  const store = await getStore(site);
  if (!store) return { ok: false, error: "المتجر غير موجود" };
  const result = await createOrder(
    store,
    { name: input.customerName, phone: input.phone, city: input.city, address: input.address, notes: input.notes },
    input.items,
  );
  if (!result.ok) return result;
  return { ok: true, number: result.order.number, whatsappUrl: whatsappOrderLink(store, result.order) };
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
