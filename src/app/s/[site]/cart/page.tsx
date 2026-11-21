import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getStore } from "@/lib/data";
import { CartView } from "./cart-view";

export const metadata: Metadata = { title: "السلة", robots: { index: false } };

export default async function CartPage({ params }: { params: Promise<{ site: string }> }) {
  const { site } = await params;
  const store = await getStore(site);
  if (!store) notFound();
  return (
    <CartView
      site={site}
      defaultCity={store.city ?? ""}
      cities={(store.shipping?.rates ?? []).map((r) => r.city)}
      delivery={Boolean(store.shipping?.delivery)}
      pickupNote={store.shipping?.pickup_note ?? ""}
      storeCity={store.city ?? ""}
    />
  );
}
