import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AddToCart, Price, ProductCard, StoreLink } from "@/components/store-ui";
import { getProduct, getProducts, getStore } from "@/lib/data";
import { whatsappLink } from "@/lib/format";

type Props = { params: Promise<{ site: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { site, id } = await params;
  const store = await getStore(site);
  const product = store ? await getProduct(store.id, id) : null;
  return product ? { title: product.title, openGraph: { images: product.images.slice(0, 1) } } : {};
}

export default async function ProductPage({ params }: Props) {
  const { site, id } = await params;
  const store = await getStore(site);
  if (!store) notFound();
  const product = await getProduct(store.id, id);
  if (!product) notFound();

  const related = (await getProducts(store.id)).filter((p) => p.id !== product.id && p.category === product.category).slice(0, 4);
  const soldOut = product.stock === 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <nav className="mb-6 text-sm text-muted">
        <StoreLink href="/">الرئيسية</StoreLink> / <StoreLink href="/products">المنتجات</StoreLink>
        {product.category && (
          <>
            {" / "}
            <StoreLink href={`/products?c=${encodeURIComponent(product.category)}`}>{product.category}</StoreLink>
          </>
        )}
      </nav>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="grid gap-3">
          {product.images.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={src} alt={product.title} className="aspect-square w-full rounded-theme bg-surface object-cover" loading={i === 0 ? "eager" : "lazy"} />
          ))}
        </div>

        <div className="flex flex-col gap-5">
          <h1 className="text-3xl leading-snug">{product.title}</h1>
          <Price amount={product.price} compare={product.compare_at_price} className="text-2xl" />
          {product.description && <p className="leading-8 text-muted">{product.description}</p>}
          <div className="max-w-sm">
            <AddToCart productId={product.id} disabled={soldOut} full />
          </div>
          <a
            href={whatsappLink(store.whatsapp, `مرحبا، عندي سؤال عن: ${product.title}`)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline max-w-sm"
          >
            اسأل عن المنتج على واتساب
          </a>
          <ul className="space-y-1 rounded-theme bg-surface p-4 text-sm text-muted">
            <li>💵 الدفع عند الاستلام</li>
            {store.delivery_note && <li>🚚 {store.delivery_note}</li>}
          </ul>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-4 text-2xl">منتجات مشابهة</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
