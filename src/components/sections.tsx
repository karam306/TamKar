import { categoriesOf } from "@/lib/data";
import { whatsappLink } from "@/lib/format";
import type { Product, Section, Store } from "@/lib/types";
import { ProductCard, StoreLink } from "./store-ui";

/** Draws a store's home page from its list of sections, in order. */
export function Sections({ store, products }: { store: Store; products: Product[] }) {
  return (
    <>
      {store.sections.map((section, i) => (
        <SectionView key={i} section={section} store={store} products={products} />
      ))}
    </>
  );
}

function SectionView({ section, store, products }: { section: Section; store: Store; products: Product[] }) {
  switch (section.type) {
    case "announcement":
      return <div className="bg-primary px-4 py-2 text-center text-sm text-white">{section.text}</div>;

    case "hero":
      return (
        <section className="relative overflow-hidden bg-surface">
          {section.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={section.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-l from-surface via-surface/85 to-surface/10" />
          <div className="relative mx-auto flex min-h-[340px] max-w-6xl flex-col justify-center gap-4 px-4 py-16 sm:min-h-[440px]">
            <h1 className="max-w-xl text-4xl leading-tight sm:text-5xl">{section.title}</h1>
            {section.subtitle && <p className="max-w-lg text-lg text-muted">{section.subtitle}</p>}
            <div>
              <StoreLink href="/products" className="btn mt-2">
                {section.buttonText || "شوف المنتجات"}
              </StoreLink>
            </div>
          </div>
        </section>
      );

    case "categories": {
      const cats = categoriesOf(products);
      if (cats.length === 0) return null;
      return (
        <section className="mx-auto max-w-6xl px-4 pt-12">
          {section.title && <h2 className="mb-4 text-2xl">{section.title}</h2>}
          <div className="flex flex-wrap gap-2">
            {cats.map((c) => (
              <StoreLink key={c} href={`/products?c=${encodeURIComponent(c)}`} className="rounded-theme border border-black/10 bg-surface px-4 py-2 text-sm hover:border-primary hover:text-primary">
                {c}
              </StoreLink>
            ))}
          </div>
        </section>
      );
    }

    case "featured_products": {
      const list = products.slice(0, section.limit ?? 8);
      if (list.length === 0) return null;
      return (
        <section className="mx-auto max-w-6xl px-4 pt-12">
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-2xl">{section.title || "منتجاتنا"}</h2>
            <StoreLink href="/products" className="text-sm text-primary">
              عرض الكل ←
            </StoreLink>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {list.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      );
    }

    case "image_text":
      return (
        <section className="mx-auto grid max-w-6xl items-center gap-6 px-4 pt-16 sm:grid-cols-2">
          {section.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={section.image} alt="" loading="lazy" className="aspect-[2/1] w-full rounded-theme object-cover" />
          )}
          <div>
            <h2 className="mb-3 text-2xl">{section.title}</h2>
            <p className="leading-8 text-muted">{section.text}</p>
          </div>
        </section>
      );

    case "testimonials":
      return (
        <section className="mx-auto max-w-6xl px-4 pt-16">
          {section.title && <h2 className="mb-4 text-2xl">{section.title}</h2>}
          <div className="grid gap-4 sm:grid-cols-3">
            {section.items.map((t, i) => (
              <figure key={i} className="rounded-theme bg-surface p-5">
                <blockquote className="leading-7">“{t.text}”</blockquote>
                <figcaption className="mt-3 text-sm text-muted">{t.name}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      );

    case "whatsapp_cta":
      return (
        <section className="mx-auto max-w-6xl px-4 pt-16">
          <div className="flex flex-col items-start justify-between gap-4 rounded-theme bg-primary p-8 text-white sm:flex-row sm:items-center">
            <div>
              <h2 className="text-2xl">{section.title}</h2>
              {section.text && <p className="mt-1 opacity-90">{section.text}</p>}
            </div>
            <a href={whatsappLink(store.whatsapp)} target="_blank" rel="noopener noreferrer" className="rounded-theme bg-white px-6 py-3 font-semibold text-primary">
              راسلنا على واتساب
            </a>
          </div>
        </section>
      );

    default:
      return null;
  }
}
