import Link from "next/link";
import { requireMerchant } from "@/lib/auth";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/lib/types";
import { toggleProduct } from "./actions";

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ q?: string; saved?: string }> }) {
  const { store, db } = await requireMerchant();
  const { q, saved } = await searchParams;
  let query = db.from("products").select("*").eq("store_id", store.id).order("created_at", { ascending: false }).limit(500);
  if (q) query = query.ilike("title", `%${q.replace(/[%_]/g, "")}%`);
  const products = ((await query).data ?? []) as Product[];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl">المنتجات ({products.length})</h1>
        <Link href="/dashboard/products/new" className="btn">
          + أضف منتج
        </Link>
      </div>
      {saved && <p className="rounded-theme bg-green-50 p-3 text-sm text-green-800">✓ انحفظ المنتج</p>}
      <form>
        <input name="q" defaultValue={q} placeholder="ابحث بالاسم..." className="input max-w-sm bg-white" />
      </form>

      {products.length === 0 ? (
        <div className="rounded-theme bg-white p-10 text-center">
          <p className="mb-4 text-muted">{q ? "ما في نتائج" : "ما ضفت منتجات لسا"}</p>
          {!q && (
            <Link href="/dashboard/products/new" className="btn">
              أضف أول منتج
            </Link>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-black/5 overflow-hidden rounded-theme bg-white">
          {products.map((p) => (
            <li key={p.id} className="flex items-center gap-3 p-3">
              <Link href={`/dashboard/products/${p.id}`} className="flex flex-1 items-center gap-3">
                {p.images[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.images[0]} alt="" className="h-14 w-14 rounded-theme bg-surface object-cover" loading="lazy" />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-theme bg-surface text-xs text-muted">بلا صورة</div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{p.title}</div>
                  <div className="text-xs text-muted">
                    {formatPrice(Number(p.price), store.currency)}
                    {p.category && ` · ${p.category}`}
                    {p.stock != null && ` · الكمية ${p.stock}`}
                  </div>
                </div>
              </Link>
              <form action={toggleProduct}>
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="active" value={p.active ? "0" : "1"} />
                <button type="submit" className={`rounded-full px-3 py-1 text-xs ${p.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                  {p.active ? "ظاهر" : "مخفي"}
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
