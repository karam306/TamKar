import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductListing } from "@/components/product-listing";
import { getCategories, getStore } from "@/lib/data";

export const metadata: Metadata = { title: "المنتجات" };

type Props = { params: Promise<{ site: string }>; searchParams: Promise<{ c?: string; q?: string; page?: string }> };

export default async function ProductsPage({ params, searchParams }: Props) {
  const store = await getStore((await params).site);
  if (!store) notFound();
  const { c, q, page } = await searchParams;
  return (
    <ProductListing
      store={store}
      path="/products"
      title="كل المنتجات"
      categories={await getCategories(store.id)}
      query={{ category: c, q: q?.trim().slice(0, 80), page: Number(page) || 1 }}
    />
  );
}
