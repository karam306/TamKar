import { notFound } from "next/navigation";
import { Sections } from "@/components/sections";
import { getCategories, getCollections, getStore, listProducts } from "@/lib/data";

export default async function StoreHome({ params }: { params: Promise<{ site: string }> }) {
  const store = await getStore((await params).site);
  if (!store) notFound();
  const limit = Math.max(8, ...store.sections.map((s) => (s.type === "featured_products" ? (s.limit ?? 8) : 0)));
  const [{ items }, categories, collections] = await Promise.all([
    listProducts(store.id, { perPage: limit }),
    getCategories(store.id),
    getCollections(store.id),
  ]);
  const ids = [...new Set(store.sections.flatMap((s) => (s.type === "collection_products" && s.collectionId && !s.hidden ? [s.collectionId] : [])))];
  const lists = await Promise.all(ids.map((id) => listProducts(store.id, { collectionId: id, perPage: 24 })));
  const byCollection = Object.fromEntries(ids.map((id, i) => [id, lists[i].items]));
  return <Sections store={store} products={items} categories={categories} collections={collections} byCollection={byCollection} />;
}
