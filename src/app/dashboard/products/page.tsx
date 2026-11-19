import Link from "next/link";
import { EmptyState, PageHeader, Pager } from "@/components/admin-ui";
import { requireMerchant } from "@/lib/auth";
import { formatPrice } from "@/lib/format";
import { hasVariants, priceRange, totalStock } from "@/lib/product-utils";
import type { Product } from "@/lib/types";
import { BulkBar } from "./bulk-bar";

const PER_PAGE = 50;
type SP = { q?: string; status?: string; page?: string };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const { store, db } = await requireMerchant();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  let query = db.from("products").select("*", { count: "exact" }).eq("store_id", store.id);
  if (sp.q) {
    const q = sp.q.replace(/[%_,()]/g, "");
    query = query.or(`title.ilike.%${q}%,sku.ilike.%${q}%`);
  }
  if (sp.status === "active") query = query.eq("active", true);
  if (sp.status === "draft") query = query.eq("active", false);
  const { data, count } = await query.order("created_at", { ascending: false }).range((page - 1) * PER_PAGE, page * PER_PAGE - 1);
  const products = (data ?? []) as Product[];
  const pages = Math.ceil((count ?? 0) / PER_PAGE);
  const link = (patch: Partial<SP>) => {
    const p = new URLSearchParams(Object.entries({ ...sp, page: undefined, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/dashboard/products${p.size ? `?${p}` : ""}`;
  };

  const tabs = [
    { id: undefined, label: "الكل" },
    { id: "active", label: "نشط" },
    { id: "draft", label: "مسودة" },
  ];

  return (
    <div>
      <PageHeader
        title="المنتجات"
        actions={
          <>
            <Link href="/dashboard/products/import" className="btn btn-outline">
              استيراد وتصدير
            </Link>
            <Link href="/dashboard/products/new" className="btn">
              أضف منتج
            </Link>
          </>
        }
      />

      {!sp.q && !sp.status && products.length === 0 ? (
        <EmptyState
          title="ضيف منتجاتك"
          text="ابدأ بإضافة أول منتج، أو استورد كل منتجاتك دفعة وحدة من ملف Excel."
          action={
            <div className="flex gap-2">
              <Link href="/dashboard/products/new" className="btn">
                أضف منتج
              </Link>
              <Link href="/dashboard/products/import" className="btn btn-outline">
                استيراد
              </Link>
            </div>
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-black/5 p-2">
            {tabs.map((t) => (
              <Link key={t.label} href={link({ status: t.id })} className={`rounded-lg px-3 py-1 ${sp.status === t.id ? "bg-black/5 font-semibold" : "text-muted hover:bg-black/5"}`}>
                {t.label}
              </Link>
            ))}
            <form className="mr-auto">
              {sp.status && <input type="hidden" name="status" value={sp.status} />}
              <input name="q" defaultValue={sp.q} placeholder="ابحث بالاسم أو SKU" className="input !py-1 w-56" />
            </form>
          </div>

          <BulkBar>
            <table className="w-full text-[13px]">
              <thead className="bg-[#f7f7f7] text-right text-xs text-muted">
                <tr>
                  <th className="w-8 p-2" />
                  <th className="p-2 font-medium">المنتج</th>
                  <th className="p-2 font-medium">الحالة</th>
                  <th className="hidden p-2 font-medium sm:table-cell">المخزون</th>
                  <th className="hidden p-2 font-medium md:table-cell">النوع</th>
                  <th className="p-2 font-medium">السعر</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {products.map((p) => {
                  const stock = totalStock(p);
                  const range = priceRange(p);
                  return (
                    <tr key={p.id} className="hover:bg-[#f7f7f7]">
                      <td className="p-2">
                        <input type="checkbox" name="ids" value={p.id} className="h-4 w-4 accent-black" aria-label="اختيار" />
                      </td>
                      <td className="p-2">
                        <Link href={`/dashboard/products/${p.id}`} className="flex items-center gap-3">
                          {p.images[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.images[0]} alt="" className="h-10 w-10 rounded-lg border border-black/5 object-cover" loading="lazy" />
                          ) : (
                            <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-dashed border-black/15 text-[10px] text-muted">صورة</span>
                          )}
                          <span className="font-semibold hover:underline">{p.title}</span>
                        </Link>
                      </td>
                      <td className="p-2">
                        <span className={`badge ${p.active ? "bg-[#affebf] text-[#014b40]" : "bg-[#e3e3e3] text-[#616161]"}`}>{p.active ? "نشط" : "مسودة"}</span>
                      </td>
                      <td className="hidden p-2 sm:table-cell">
                        {stock === null ? (
                          <span className="text-muted">غير محدود</span>
                        ) : (
                          <span className={stock === 0 ? "text-red-700" : ""}>
                            {stock} بالمخزون{hasVariants(p) ? ` لـ ${p.variants!.length} خيار` : ""}
                          </span>
                        )}
                      </td>
                      <td className="hidden p-2 text-muted md:table-cell">{p.category}</td>
                      <td className="whitespace-nowrap p-2">
                        {range.max > range.min
                          ? `${formatPrice(range.min, store.currency)} - ${formatPrice(range.max, store.currency)}`
                          : formatPrice(range.min, store.currency)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </BulkBar>
          {products.length === 0 && <p className="p-10 text-center text-muted">ما في منتجات مطابقة</p>}
          <Pager page={page} pages={pages} href={(n) => link({ page: String(n) })} />
        </div>
      )}
    </div>
  );
}
