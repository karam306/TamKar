import { whatsappLink } from "@/lib/format";
import type { Collection, Product, Section, Store } from "@/lib/types";
import { RichText } from "./rich-text";
import { FaqItem } from "./faq-item";
import { ProductCard, StoreLink } from "./store-ui";

type Data = { store: Store; products: Product[]; categories: string[]; collections: Collection[]; byCollection?: Record<string, Product[]> };

/** Draws a store's home page from its list of sections, in order. */
export function Sections(data: Data) {
  return (
    <>
      {data.store.sections
        .filter((s) => !s.hidden)
        .map((section, i) => (
          <SectionView key={i} section={section} {...data} />
        ))}
    </>
  );
}

function SectionView({ section, store, products, categories, collections, byCollection }: Data & { section: Section }) {
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
      // Collections first (chosen by the merchant); otherwise product types.
      const links = collections.length
        ? collections.map((c) => ({ label: c.title, href: `/collections/${c.handle}`, image: c.image }))
        : categories.map((c) => ({ label: c, href: `/products?c=${encodeURIComponent(c)}`, image: null as string | null | undefined }));
      if (links.length === 0) return null;
      const withImages = links.some((l) => l.image);
      return (
        <section className="mx-auto max-w-6xl px-4 pt-12">
          {section.title && <h2 className="mb-4 text-2xl">{section.title}</h2>}
          {withImages ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {links.map((l) => (
                <StoreLink key={l.href} href={l.href} className="group overflow-hidden rounded-theme bg-surface">
                  {l.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={l.image} alt="" loading="lazy" className="aspect-square w-full object-cover transition-transform group-hover:scale-105" />
                  ) : (
                    <div className="aspect-square w-full bg-primary/10" />
                  )}
                  <div className="p-3 text-center font-semibold">{l.label}</div>
                </StoreLink>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {links.map((l) => (
                <StoreLink key={l.href} href={l.href} className="rounded-theme border border-black/10 bg-surface px-4 py-2 text-sm hover:border-primary hover:text-primary">
                  {l.label}
                </StoreLink>
              ))}
            </div>
          )}
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

    case "collection_products": {
      const col = collections.find((c) => c.id === section.collectionId);
      const list = (section.collectionId ? byCollection?.[section.collectionId] : []) ?? [];
      if (!col || list.length === 0) return null;
      return (
        <section className="mx-auto max-w-6xl px-4 pt-12">
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-2xl">{section.title || col.title}</h2>
            <StoreLink href={`/collections/${col.handle}`} className="text-sm text-primary">
              عرض الكل ←
            </StoreLink>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {list.slice(0, section.limit ?? 8).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      );
    }

    case "image_banner":
      return (
        <section className="mx-auto max-w-6xl px-4 pt-12">
          <div className="relative overflow-hidden rounded-theme bg-primary">
            {section.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={section.image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
            )}
            <div className={`relative flex min-h-[220px] flex-col items-start justify-center gap-3 p-8 text-white ${section.image ? "bg-black/35" : ""}`}>
              {section.title && <h2 className="text-3xl">{section.title}</h2>}
              {section.text && <p className="max-w-lg opacity-90">{section.text}</p>}
              {section.buttonText && (
                <StoreLink href={section.link || "/products"} className="rounded-theme bg-white px-6 py-2.5 font-semibold text-primary">
                  {section.buttonText}
                </StoreLink>
              )}
            </div>
          </div>
        </section>
      );

    case "features":
      if (!section.items.length) return null;
      return (
        <section className="mx-auto max-w-6xl px-4 pt-10">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {section.items.map((f, i) => (
              <div key={i} className="flex items-center gap-3 rounded-theme bg-surface p-4">
                <span className="text-2xl">{f.icon}</span>
                <div>
                  <div className="font-semibold">{f.title}</div>
                  {f.text && <div className="text-xs text-muted">{f.text}</div>}
                </div>
              </div>
            ))}
          </div>
        </section>
      );

    case "faq":
      if (!section.items.length) return null;
      return (
        <section className="mx-auto max-w-3xl px-4 pt-16">
          {section.title && <h2 className="mb-4 text-center text-2xl">{section.title}</h2>}
          <div className="divide-y divide-black/10 rounded-theme bg-surface">
            {section.items.map((f, i) => (
              <FaqItem key={i} q={f.q} a={f.a} />
            ))}
          </div>
        </section>
      );

    case "rich_text":
      return (
        <section className="mx-auto max-w-3xl px-4 pt-16 text-center">
          {section.title && <h2 className="mb-3 text-2xl">{section.title}</h2>}
          <RichText text={section.text} className="text-muted" />
        </section>
      );

    default:
      return null;
  }
}
