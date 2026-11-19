import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductListing } from "@/components/product-listing";
import { getCollections, getStore } from "@/lib/data";

type Props = { params: Promise<{ site: string; handle: string }>; searchParams: Promise<{ q?: string; page?: string }> };

async function load(site: string, handle: string) {
  const store = await getStore(site);
  if (!store) return null;
  const collection = (await getCollections(store.id)).find((c) => c.handle === handle);
  return collection ? { store, collection } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { site, handle } = await params;
  const r = await load(site, handle);
  return r ? { title: r.collection.title, description: r.collection.description ?? undefined } : {};
}

export default async function CollectionPage({ params, searchParams }: Props) {
  const { site, handle } = await params;
  const r = await load(site, handle);
  if (!r) notFound();
  const { q, page } = await searchParams;
  return (
    <ProductListing
      store={r.store}
      path={`/collections/${handle}`}
      title={r.collection.title}
      description={r.collection.description}
      categories={[]}
      query={{ collectionId: r.collection.id, q: q?.trim().slice(0, 80), page: Number(page) || 1 }}
    />
  );
}
