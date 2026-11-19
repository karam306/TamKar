import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { StoreProvider } from "@/components/store-context";
import { CartButton, StoreLink } from "@/components/store-ui";
import { StoreTracking } from "@/components/tracking";
import { getStore } from "@/lib/data";
import { whatsappLink } from "@/lib/format";

type Props = { children: React.ReactNode; params: Promise<{ site: string }> };

export async function generateMetadata({ params }: Omit<Props, "children">): Promise<Metadata> {
  const store = await getStore((await params).site);
  if (!store) return {};
  return { title: { default: store.name, template: `%s | ${store.name}` }, description: store.tagline };
}

export default async function StoreLayout({ children, params }: Props) {
  const { site } = await params;
  const store = await getStore(site);
  if (!store) notFound();

  const onOwnHost = (await headers()).get("x-store-host") === "1";
  const base = onOwnHost ? "" : `/s/${store.slug}`;
  const style = store.primary_color ? ({ "--primary": store.primary_color } as React.CSSProperties) : undefined;
  const platform = process.env.NEXT_PUBLIC_PLATFORM_NAME || "TamKar";

  return (
    <div data-theme={store.theme} style={style} className="flex min-h-screen flex-col bg-bg font-sans text-text">
      <StoreProvider info={{ slug: store.slug, base, currency: store.currency, whatsapp: store.whatsapp, name: store.name }}>
        <StoreTracking slug={store.slug} pixelId={store.meta_pixel_id} />
        <header className="sticky top-0 z-20 border-b border-black/5 bg-bg/95 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
            <StoreLink href="/" className="flex items-center gap-2 text-xl font-bold text-primary">
              {store.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={store.logo_url} alt={store.name} className="h-9 w-auto" />
              ) : (
                store.name
              )}
            </StoreLink>
            <nav className="flex items-center gap-1 text-sm">
              <StoreLink href="/products" className="rounded-theme px-3 py-2 hover:bg-surface">
                المنتجات
              </StoreLink>
              <CartButton />
            </nav>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="mt-16 border-t border-black/5 bg-surface">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 text-sm sm:grid-cols-3">
            <div>
              <div className="mb-2 text-lg font-bold text-primary">{store.name}</div>
              {store.tagline && <p className="text-muted">{store.tagline}</p>}
            </div>
            <div className="text-muted">
              {store.city && <p>📍 {store.city}</p>}
              {store.delivery_note && <p className="mt-1">🚚 {store.delivery_note}</p>}
              <p className="mt-1">💵 الدفع عند الاستلام</p>
            </div>
            <div>
              <a href={whatsappLink(store.whatsapp)} target="_blank" rel="noopener noreferrer" className="btn btn-outline text-sm">
                تواصل معنا على واتساب
              </a>
            </div>
          </div>
          <div className="pb-6 text-center text-xs text-muted">
            متجر مبني على منصة {platform}
          </div>
        </footer>
      </StoreProvider>
    </div>
  );
}
