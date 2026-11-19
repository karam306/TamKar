export const dynamic = "force-dynamic";

import { getCollections, getPages, getStore, listProducts } from "@/lib/data";
import { storeOrigin } from "@/lib/site-origin";

export async function GET(_: Request, { params }: { params: Promise<{ site: string }> }) {
  const { site } = await params;
  const store = await getStore(site);
  if (!store) return new Response("Not found", { status: 404 });
  const base = await storeOrigin(store.slug);
  const [{ items }, cols, pages] = await Promise.all([listProducts(store.id, { perPage: 1000 }), getCollections(store.id), getPages(store.id)]);
  const urls = [
    "",
    "/products",
    ...cols.map((c) => `/collections/${encodeURIComponent(c.handle)}`),
    ...pages.map((p) => `/pages/${encodeURIComponent(p.handle)}`),
    ...items.map((p) => `/p/${p.id}`),
  ];
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${esc(base + u)}</loc></url>`)
    .join("\n")}\n</urlset>\n`;
  return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
