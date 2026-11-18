import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductCard, StoreLink } from "@/components/store-ui";
import { categoriesOf, getProducts, getStore } from "@/lib/data";

export const metadata: Metadata = { title: "المنتجات" };

type Props = { params: Promise<{ site: string }>; searchParams: Promise<{ c?: string; q?: string }> };

export default async function ProductsPage({ params, searchParams }: Props) {
  const store = await getStore((await params).site);
  if (!store) notFound();
  const { c, q } = await searchParams;
  const all = await getProducts(store.id);
  const cats = categoriesOf(all);
  const query = (q || "").trim();
  const list = all.filter((p) => (!c || p.category === c) && (!query || p.title.includes(query)));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-4 text-3xl">{c || "كل المنتجات"}</h1>

      <form className="mb-4" action="">
        {c && <input type="hidden" name="c" value={c} />}
        <input name="q" defaultValue={query} placeholder="ابحث عن منتج..." className="input max-w-md" />
      </form>

      {cats.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2 text-sm">
          <StoreLink href="/products" className={`rounded-theme px-4 py-2 ${!c ? "bg-primary text-white" : "bg-surface"}`}>
            الكل
          </StoreLink>
          {cats.map((cat) => (
            <StoreLink key={cat} href={`/products?c=${encodeURIComponent(cat)}`} className={`rounded-theme px-4 py-2 ${c === cat ? "bg-primary text-white" : "bg-surface"}`}>
              {cat}
            </StoreLink>
          ))}
        </div>
      )}

      {list.length === 0 ? (
        <p className="py-16 text-center text-muted">ما في منتجات مطابقة</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {list.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
