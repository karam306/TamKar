import { offerText } from "@/lib/offers";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductGallery } from "@/components/product-gallery";
import { ProductCard, StoreLink } from "@/components/store-ui";
import { TrackProductView } from "@/components/tracking";
import { SimpleBuy, VariantPicker } from "@/components/variant-picker";
import { getProduct, getStore, listProducts } from "@/lib/data";
import { whatsappLink } from "@/lib/format";
import { contentId, hasVariants } from "@/lib/product-utils";

type Props = { params: Promise<{ site: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { site, id } = await params;
  const store = await getStore(site);
  const product = store ? await getProduct(store.id, id) : null;
  return product
    ? { title: product.title, description: product.description?.slice(0, 160), openGraph: { images: product.images.slice(0, 1) } }
    : {};
}

export default async function ProductPage({ params }: Props) {
  const { site, id } = await params;
  const store = await getStore(site);
  if (!store) notFound();
  const product = await getProduct(store.id, id);
  if (!product) notFound();

  const related = product.category
    ? (await listProducts(store.id, { category: product.category, perPage: 5 })).items.filter((p) => p.id !== product.id).slice(0, 4)
    : [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <TrackProductView id={hasVariants(product) ? contentId(product.id, product.variants![0].id) : product.id} title={product.title} value={product.price} currency={store.currency} />
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
        <ProductGallery images={product.images} title={product.title} />

        <div className="flex flex-col gap-5">
          <h1 className="text-3xl leading-snug">{product.title}</h1>
          {(product.qty_prices?.length ?? 0) > 0 && (
            <div className="max-w-sm rounded-theme border border-primary/30 bg-primary/5 p-3 text-sm">
              <div className="mb-1 font-semibold">عروض الكمية</div>
              <ul className="space-y-0.5">
                {product.qty_prices!.map((t) => (
                  <li key={t.min}>{offerText(t)}</li>
                ))}
              </ul>
              {hasVariants(product) && <div className="mt-1 text-xs text-muted">تُحسب كل الخيارات معاً.</div>}
            </div>
          )}
          {hasVariants(product) ? <VariantPicker product={product} /> : <SimpleBuy product={product} />}
          <a
            href={whatsappLink(store.whatsapp, `مرحباً، لدي سؤال عن: ${product.title}`)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline max-w-sm"
          >
            اسأل عن المنتج عبر واتساب
          </a>
          <ul className="space-y-1 rounded-theme bg-surface p-4 text-sm text-muted">
            <li>💵 الدفع عند الاستلام</li>
            {store.delivery_note && <li>{store.shipping?.delivery ? "🚚" : "🏪"} {store.delivery_note}</li>}
          </ul>
          {product.description && <div className="whitespace-pre-line leading-8 text-muted">{product.description}</div>}
          {(product.specs?.length ?? 0) > 0 && (
            <div>
              <h2 className="mb-2 text-lg">المواصفات</h2>
              <table className="w-full overflow-hidden rounded-theme text-sm">
                <tbody>
                  {product.specs!.map((s, i) => (
                    <tr key={i} className={i % 2 ? "bg-bg" : "bg-surface"}>
                      <th className="w-1/3 p-3 text-right font-semibold">{s.name}</th>
                      <td className="p-3 text-muted">{s.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
