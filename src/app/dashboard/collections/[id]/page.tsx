import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin-ui";
import { requireAccess } from "@/lib/auth";
import type { Collection, Product } from "@/lib/types";
import { storeUrl } from "@/lib/urls";
import { deleteCollection, setCollectionProducts } from "../actions";
import { CollectionForm } from "../collection-form";

export default async function EditCollectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; q?: string }>;
}) {
  const { store, db } = await requireAccess("products");
  const { id } = await params;
  const { created, q } = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { data } = await db
    .from("collections")
    .select("*")
    .eq("id", id)
    .eq("store_id", store.id)
    .maybeSingle();
  if (!data) notFound();
  const collection = data as Collection;

  const { data: inside } = await db
    .from("products")
    .select("id, title, images")
    .eq("store_id", store.id)
    .contains("collection_ids", [id])
    .limit(200);
  let candidates: Pick<Product, "id" | "title" | "images">[] = [];
  if (q) {
    const { data: found } = await db
      .from("products")
      .select("id, title, images, collection_ids")
      .eq("store_id", store.id)
      .ilike("title", `%${q.replace(/[%_,()]/g, "")}%`)
      .limit(20);
    candidates = (found ?? []).filter(
      (p) => !((p.collection_ids as string[]) ?? []).includes(id),
    ) as typeof candidates;
  }

  return (
    <div>
      <PageHeader
        title={collection.title}
        back="/dashboard/collections"
        actions={
          <a
            href={`${storeUrl(store.slug)}/collections/${collection.handle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline"
          >
            معاينة ↗
          </a>
        }
      />
      {created && (
        <p className="card mb-4 p-3 text-[13px]">
          ✓ أُنشئت المجموعة. أضف إليها منتجات من الأسفل.
        </p>
      )}
      <CollectionForm collection={collection} />

      <section className="card mt-4 space-y-3 p-4 lg:max-w-[calc(100%-316px)]">
        <h2 className="text-sm font-semibold">
          المنتجات ({inside?.length ?? 0})
        </h2>
        <form className="flex gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="ابحث عن منتج لإضافته..."
            className="input"
          />
          <button className="btn btn-outline">بحث</button>
        </form>
        {q && (
          <form
            action={setCollectionProducts}
            className="space-y-1 rounded-lg border border-black/10 p-2"
          >
            <input type="hidden" name="id" value={id} />
            {candidates.length === 0 ? (
              <p className="p-2 text-muted">لا توجد نتائج</p>
            ) : (
              candidates.map((p) => (
                <label
                  key={p.id}
                  className="flex items-center gap-2 rounded p-1 hover:bg-[#f7f7f7]"
                >
                  <input
                    type="checkbox"
                    name="product_ids"
                    value={p.id}
                    className="h-4 w-4 accent-black"
                  />
                  {p.title}
                </label>
              ))
            )}
            {candidates.length > 0 && (
              <button className="btn">إضافة المحدد</button>
            )}
          </form>
        )}
        <ul className="divide-y divide-black/5">
          {(inside ?? []).map((p) => (
            <li key={p.id} className="flex items-center gap-3 py-2">
              {(p.images as string[])[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={(p.images as string[])[0]}
                  alt=""
                  className="h-9 w-9 rounded-lg object-cover"
                />
              ) : (
                <span className="h-9 w-9 rounded-lg bg-[#e3e3e3]" />
              )}
              <Link
                href={`/dashboard/products/${p.id}`}
                className="flex-1 hover:underline"
              >
                {p.title as string}
              </Link>
              <form action={setCollectionProducts}>
                <input type="hidden" name="id" value={id} />
                <input type="hidden" name="mode" value="remove" />
                <input
                  type="hidden"
                  name="product_ids"
                  value={p.id as string}
                />
                <button className="text-xs text-muted hover:text-red-700">
                  إزالة
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      <details className="card mt-6 p-4 text-[13px]">
        <summary className="cursor-pointer font-semibold text-red-700">
          حذف المجموعة
        </summary>
        <form
          action={deleteCollection}
          className="mt-3 flex items-center gap-3"
        >
          <input type="hidden" name="id" value={id} />
          <span className="text-muted">تُحذف المجموعة فقط، ولا تُحذف المنتجات.</span>
          <button className="btn !bg-[#c70a24]">حذف</button>
        </form>
      </details>
    </div>
  );
}
