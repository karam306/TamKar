export const dynamic = "force-dynamic";

import { getStore } from "@/lib/data";
import { storeOrigin } from "@/lib/site-origin";

export async function GET(_: Request, { params }: { params: Promise<{ site: string }> }) {
  const { site } = await params;
  const store = await getStore(site);
  if (!store) return new Response("Not found", { status: 404 });
  const base = await storeOrigin(store.slug);
  const body = `User-agent: *\nAllow: /\nDisallow: /cart\n\nSitemap: ${base}/${base.includes("/s/") ? "store-sitemap" : "sitemap.xml"}\n`;
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
