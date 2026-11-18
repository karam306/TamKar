import { notFound } from "next/navigation";
import { Sections } from "@/components/sections";
import { getProducts, getStore } from "@/lib/data";

export default async function StoreHome({ params }: { params: Promise<{ site: string }> }) {
  const store = await getStore((await params).site);
  if (!store) notFound();
  const products = await getProducts(store.id);
  return <Sections store={store} products={products} />;
}
