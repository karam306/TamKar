import { Fragment } from "react";
import { whatsappLink } from "@/lib/format";
import type { Collection, Product, Section, Store } from "@/lib/types";
import { RichText } from "./rich-text";
import { FaqItem } from "./faq-item";
import { HowToOrder, ProductMosaic, TrustStrip } from "./store-extras";
import { ProductCard, StoreLink } from "./store-ui";

type Data = { store: Store; products: Product[]; categories: string[]; collections: Collection[]; byCollection?: Record<string, Product[]> };

/** Draws a store's home page from its list of sections, in order. */
export function Sections(data: Data) {
  const shown = data.store.sections.filter((s) => !s.hidden);
  // Added for every store: the trust strip under the hero (unless the merchant made their
  // own "features" section) and "how to order" before the closing call to action.
  const ownFeatures = shown.some((s) => s.type === "features");
  const heroAt = shown.findIndex((s) => s.type === "hero");
  const lastCta = shown.map((s) => s.type).lastIndexOf("whatsapp_cta");
  const howAt = lastCta === -1 ? shown.length : lastCta;
  return (
    <>
      {shown.map((section, i) => (
        <Fragment key={i}>
          {i === howAt && <HowToOrder store={data.store} />}
          <SectionView section={section} {...data} />
          {i === heroAt && !ownFeatures && <TrustStrip store={data.store} />}
        </Fragment>
      ))}
      {howAt === shown.length && <HowToOrder store={data.store} />}
      {heroAt === -1 && !ownFeatures && <TrustStrip store={data.store} />}
    </>
  );
}

/**
 * Products in rows with no gaps. Phones: a row you swipe. Computers: 3 or 4 columns,
 * whichever fills every row (6 products = 2 rows of 3).
 */
function ProductRow({ list }: { list: Product[] }) {
  const n = list.length;
  const cols = n % 4 === 0 || n < 3 ? 4 : n % 3 === 0 ? 3 : 4;
  const shown = cols === 4 && n > 4 && n % 4 !== 0 ? list.slice(0, n - (n % 4)) : list;
  return (
    <div
      className={`-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0 ${cols === 3 ? "sm:grid-cols-3" : "sm:grid-cols-3 lg:grid-cols-4"}`}
    >
      {shown.map((p) => (
        <div key={p.id} className="w-[46%] shrink-0 snap-start sm:w-auto">
          <ProductCard product={p} />
        </div>
      ))}
    </div>
  );
}

function SectionHead({ title, href }: { title: string; href: string }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <h2 className="text-2xl sm:text-3xl">{title}</h2>
      <StoreLink href={href} className="shrink-0 text-sm font-semibold text-primary hover:underline">
        عرض الكل
      </StoreLink>
    </div>
  );
}

function SectionView({ section, store, products, categories, collections, byCollection }: Data & { section: Section }) {
  switch (section.type) {
    case "announcement":
      return <div className="st-announce bg-primary px-4 py-2 text-center text-sm text-white">{section.text}</div>;

    case "hero": {
      const logo = store.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={store.logo_url} alt={store.name} className="mb-2 h-12 w-auto max-w-[180px] object-contain" />
      ) : null;
      const cta = (light: boolean) => (
        <div className="flex flex-wrap gap-3">
          <StoreLink href="/products" className={`btn ${light ? "!bg-white !text-text" : ""}`}>
            {section.buttonText || "تصفّح المنتجات"}
          </StoreLink>
          <a
            href={whatsappLink(store.whatsapp)}
            target="_blank"
            rel="noopener noreferrer"
            className={`btn btn-outline ${light ? "!border-white/70 !text-white" : ""}`}
          >
            اسألنا عبر واتساب
          </a>
        </div>
      );
      // The merchant's own photo: full width, text on a soft shade so it stays readable.
      if (section.image)
        return (
          <section className="st-hero relative overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={section.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="st-hero-shade absolute inset-0 bg-gradient-to-l from-black/70 via-black/40 to-black/10" />
            <div className="relative mx-auto flex min-h-[380px] max-w-6xl flex-col justify-center gap-4 px-4 py-16 text-white sm:min-h-[480px]">
              {logo}
              <h1 className="st-hero-title max-w-xl text-4xl leading-tight sm:text-5xl">{section.title}</h1>
              {section.subtitle && <p className="max-w-lg text-lg opacity-90">{section.subtitle}</p>}
              <div className="pt-2">{cta(true)}</div>
            </div>
          </section>
        );
      // No photo: the store's own products make the picture.
      const mosaic = <ProductMosaic products={products} />;
      return (
        <section className="st-hero st-hero-plain bg-surface">
          <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-10 sm:py-14 md:grid-cols-2">
            <div className="flex flex-col gap-4">
              {logo}
              <h1 className="st-hero-title text-4xl leading-tight sm:text-5xl">{section.title}</h1>
              {section.subtitle && <p className="max-w-lg text-lg text-muted">{section.subtitle}</p>}
              <div className="pt-2">{cta(false)}</div>
            </div>
            <div className="h-56 sm:h-80">{mosaic}</div>
          </div>
        </section>
      );
    }

    case "categories": {
      // Collections first (chosen by the merchant); otherwise product types.
      const links = collections.length
        ? collections.map((c) => ({ label: c.title, href: `/collections/${c.handle}`, image: c.image }))
        : categories.map((c) => ({ label: c, href: `/products?c=${encodeURIComponent(c)}`, image: null as string | null | undefined }));
      // One lonely link is not worth a section.
      if (links.length < 2) return null;
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
        <section className="mx-auto max-w-6xl px-4 pt-14">
          <SectionHead title={section.title || "منتجاتنا"} href="/products" />
          <ProductRow list={list} />
        </section>
      );
    }

    case "image_text":
      if (!section.image)
        return (
          <section className="mx-auto max-w-3xl px-4 pt-16 text-center">
            <h2 className="mb-3 text-2xl">{section.title}</h2>
            <p className="leading-8 text-muted">{section.text}</p>
          </section>
        );
      return (
        <section className="mx-auto grid max-w-6xl items-center gap-6 px-4 pt-16 sm:grid-cols-2">
          {section.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={section.image} alt="" loading="lazy" className="aspect-[4/3] w-full rounded-theme object-cover" />
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
              راسلنا عبر واتساب
            </a>
          </div>
        </section>
      );

    case "collection_products": {
      const col = collections.find((c) => c.id === section.collectionId);
      const list = (section.collectionId ? byCollection?.[section.collectionId] : []) ?? [];
      if (!col || list.length === 0) return null;
      return (
        <section className="mx-auto max-w-6xl px-4 pt-14">
          <SectionHead title={section.title || col.title} href={`/collections/${col.handle}`} />
          <ProductRow list={list.slice(0, section.limit ?? 8)} />
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
              <div key={i} className="st-tile flex items-center gap-3 rounded-theme bg-surface p-4">
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
