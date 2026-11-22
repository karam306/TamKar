import { listProducts, type ProductQuery } from "@/lib/data";
import type { Store } from "@/lib/types";
import { ProductCard, StoreLink } from "./store-ui";

/** Product grid with search, type filter and pages. Used by /products and collection pages. */
export async function ProductListing({
  store,
  path,
  title,
  description,
  query,
  categories,
}: {
  store: Store;
  path: string;
  title: string;
  description?: string | null;
  query: ProductQuery;
  categories: string[];
}) {
  const perPage = 24;
  const page = Math.max(1, query.page ?? 1);
  const { items, total } = await listProducts(store.id, { ...query, page, perPage });
  const pages = Math.ceil(total / perPage);
  const link = (patch: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    const merged = { c: query.category, q: query.q, page: undefined as number | undefined, ...patch };
    Object.entries(merged).forEach(([k, v]) => v !== undefined && v !== "" && p.set(k, String(v)));
    const s = p.toString();
    return s ? `${path}?${s}` : path;
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl">{query.category || title}</h1>
      {description && <p className="mt-2 max-w-2xl text-muted">{description}</p>}

      <form className="my-4">
        {query.category && <input type="hidden" name="c" value={query.category} />}
        <input name="q" defaultValue={query.q} placeholder="ابحث عن منتج..." className="input max-w-md" />
      </form>

      {categories.length > 1 && (
        <div className="mb-6 flex flex-wrap gap-2 text-sm">
          <StoreLink href={link({ c: undefined })} className={`rounded-theme px-4 py-2 ${!query.category ? "bg-primary text-white" : "bg-surface"}`}>
            الكل
          </StoreLink>
          {categories.map((cat) => (
            <StoreLink key={cat} href={link({ c: cat })} className={`rounded-theme px-4 py-2 ${query.category === cat ? "bg-primary text-white" : "bg-surface"}`}>
              {cat}
            </StoreLink>
          ))}
        </div>
      )}

      {items.length === 0 ? (
        <p className="py-16 text-center text-muted">لا توجد منتجات مطابقة</p>
      ) : (
        <>
          <p className="mb-3 text-sm text-muted">{total} منتج</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {items.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </>
      )}

      {pages > 1 && (
        <nav className="mt-8 flex items-center justify-center gap-2 text-sm">
          {page > 1 && (
            <StoreLink href={link({ page: page - 1 })} className="btn btn-outline !py-2">
              → السابق
            </StoreLink>
          )}
          <span className="px-3 text-muted">
            صفحة {page} من {pages}
          </span>
          {page < pages && (
            <StoreLink href={link({ page: page + 1 })} className="btn btn-outline !py-2">
              التالي ←
            </StoreLink>
          )}
        </nav>
      )}
    </div>
  );
}
