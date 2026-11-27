import { getStore, listProducts } from "@/lib/data";

// Live suggestions for the search box in the store header: the best few matches.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = (url.searchParams.get("s") ?? "").slice(0, 60);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 80);
  if (!slug || q.length < 2) return Response.json({ items: [], total: 0 });
  const store = await getStore(slug);
  if (!store) return Response.json({ items: [], total: 0 }, { status: 404 });
  const { items, total } = await listProducts(store.id, { q, page: 1, perPage: 6 });
  return Response.json(
    {
      total,
      items: items.map((p) => ({
        id: p.id,
        title: p.title,
        price: p.price,
        compare: p.compare_at_price ?? null,
        image: p.images?.[0] ?? null,
      })),
    },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
  );
}
