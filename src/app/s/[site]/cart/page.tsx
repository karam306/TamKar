import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProducts, getStore } from "@/lib/data";
import { CartView } from "./cart-view";

export const metadata: Metadata = { title: "السلة", robots: { index: false } };

export default async function CartPage({ params }: { params: Promise<{ site: string }> }) {
  const { site } = await params;
  const store = await getStore(site);
  if (!store) notFound();
  const products = (await getProducts(store.id)).map((p) => ({
    id: p.id,
    title: p.title,
    price: p.price,
    image: p.images[0] ?? "",
    stock: p.stock ?? null,
  }));
  return <CartView site={site} products={products} defaultCity={store.city ?? ""} />;
}
