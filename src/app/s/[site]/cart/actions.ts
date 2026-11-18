"use server";

import { createOrder, getStore } from "@/lib/data";
import { whatsappOrderLink } from "@/lib/format";
import type { OrderInput } from "@/lib/types";

export type PlaceOrderResult = { ok: true; number: number; whatsappUrl: string } | { ok: false; error: string };

export async function placeOrder(site: string, input: OrderInput): Promise<PlaceOrderResult> {
  const store = await getStore(site);
  if (!store) return { ok: false, error: "المتجر غير موجود" };
  const result = await createOrder(store, input);
  if (!result.ok) return result;
  return { ok: true, number: result.order.number, whatsappUrl: whatsappOrderLink(store, result.order) };
}
