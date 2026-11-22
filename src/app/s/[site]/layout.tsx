import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { StoreMobileMenu } from "@/components/store-menu";
import { StoreProvider } from "@/components/store-context";
import { CartButton, StoreLink } from "@/components/store-ui";
import { StoreTracking } from "@/components/tracking";
import { getStore } from "@/lib/data";
import { whatsappLink } from "@/lib/format";
import { isOpen } from "@/lib/subscription";
import type { MenuLink, StoreSocial } from "@/lib/types";
import { isPro } from "@/lib/plans";
import { BRAND, BRAND_AR } from "@/lib/brand";

type Props = { children: React.ReactNode; params: Promise<{ site: string }> };

export async function generateMetadata({ params }: Omit<Props, "children">): Promise<Metadata> {
  const store = await getStore((await params).site);
  if (!store) return {};
  const title = store.seo?.title || store.name;
  const description = store.seo?.description || store.tagline;
  const image = store.seo?.image || store.logo_url || undefined;
  return {
    title: { default: title, template: `%s | ${store.name}` },
    description,
    openGraph: { title, description, siteName: store.name, images: image ? [image] : undefined, locale: "ar_SY", type: "website" },
    icons: store.logo_url ? { icon: store.logo_url } : undefined,
  };
}

const SOCIAL: { key: keyof StoreSocial; label: string; d: string }[] = [
  { key: "instagram", label: "Instagram", d: "M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zm5 5a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm5.5-1.5h.01" },
  { key: "facebook", label: "Facebook", d: "M14 8h3V4h-3a4 4 0 0 0-4 4v2H7v4h3v7h4v-7h3l1-4h-4V8z" },
  { key: "tiktok", label: "TikTok", d: "M15 3v3a5 5 0 0 0 5 5v3a8 8 0 0 1-5-1.7V17a5 5 0 1 1-5-5v3a2 2 0 1 0 2 2V3h3z" },
  { key: "telegram", label: "Telegram", d: "M21 4L3 11l6 2 2 6 3-4 5 4 2-15zM9 13l9-6-7 8" },
];

export default async function StoreLayout({ children, params }: Props) {
  const { site } = await params;
  const store = await getStore(site);
  if (!store) notFound();
  if (!isOpen(store)) {
    return (
      <div data-theme={store.theme} className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg p-8 text-center font-sans text-text">
        <h1 className="text-2xl">{store.name}</h1>
        <p className="text-muted">المتجر متوقف مؤقتاً. تواصل معنا عبر واتساب لتقديم طلبك.</p>
        <a href={whatsappLink(store.whatsapp)} className="btn" target="_blank" rel="noopener noreferrer">
          واتساب
        </a>
      </div>
    );
  }

  const onOwnHost = (await headers()).get("x-store-host") === "1";
  const base = onOwnHost ? "" : `/s/${store.slug}`;
  const style = store.primary_color ? ({ "--primary": store.primary_color } as React.CSSProperties) : undefined;
  const platform = BRAND_AR;
  const header: MenuLink[] = store.menus?.header?.length ? store.menus.header : [{ label: "المنتجات", href: "/products" }];
  const footer: MenuLink[] = store.menus?.footer ?? [];
  const social = SOCIAL.filter((s) => store.social?.[s.key]);

  return (
    <div data-theme={store.theme} style={style} className="flex min-h-screen flex-col bg-bg font-sans text-text">
      <StoreProvider info={{ slug: store.slug, base, currency: store.currency, whatsapp: store.whatsapp, name: store.name }}>
        <StoreTracking slug={store.slug} pixelId={isPro(store) ? store.meta_pixel_id : null} />
        <header className="sticky top-0 z-20 border-b border-black/5 bg-bg/95 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
            <div className="flex items-center gap-2">
              <StoreMobileMenu links={header} />
              <StoreLink href="/" className="flex items-center gap-2 text-xl font-bold text-primary">
                {store.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={store.logo_url} alt={store.name} className="h-9 w-auto" />
                ) : (
                  store.name
                )}
              </StoreLink>
            </div>
            <nav className="flex items-center gap-1 text-sm">
              {header.map((l) => (
                <MenuItem key={l.href + l.label} link={l} className="hidden rounded-theme px-3 py-2 hover:bg-surface md:block" />
              ))}
              <CartButton />
            </nav>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="mt-16 border-t border-black/5 bg-surface">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm sm:grid-cols-3">
            <div className="space-y-2">
              <div className="text-lg font-bold text-primary">{store.name}</div>
              {store.tagline && <p className="text-muted">{store.tagline}</p>}
              {social.length > 0 && (
                <div className="flex gap-2 pt-1">
                  {social.map((s) => (
                    <a
                      key={s.key}
                      href={store.social![s.key]}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={s.label}
                      className="rounded-full border border-black/10 p-2 text-muted hover:text-primary"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d={s.d} />
                      </svg>
                    </a>
                  ))}
                </div>
              )}
            </div>
            {footer.length > 0 && (
              <ul className="space-y-2">
                {footer.map((l) => (
                  <li key={l.href + l.label}>
                    <MenuItem link={l} className="text-muted hover:text-primary" />
                  </li>
                ))}
              </ul>
            )}
            <div className="space-y-1 text-muted">
              {store.city && <p>📍 {store.city}</p>}
              {store.delivery_note && <p>{store.shipping?.delivery ? "🚚" : "🏪"} {store.delivery_note}</p>}
              <p>💵 الدفع عند الاستلام</p>
              <a href={whatsappLink(store.whatsapp)} target="_blank" rel="noopener noreferrer" className="btn btn-outline mt-3 text-sm">
                تواصل معنا عبر واتساب
              </a>
            </div>
          </div>
          {!isPro(store) && <div className="pb-6 text-center text-xs text-muted">متجر مبني على منصة {platform} ({BRAND})</div>}
        </footer>
      </StoreProvider>
    </div>
  );
}

function MenuItem({ link, className }: { link: MenuLink; className?: string }) {
  if (/^https?:\/\//.test(link.href)) {
    return (
      <a href={link.href} target="_blank" rel="noopener noreferrer" className={className}>
        {link.label}
      </a>
    );
  }
  return (
    <StoreLink href={link.href} className={className}>
      {link.label}
    </StoreLink>
  );
}
