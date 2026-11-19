import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/admin-ui";
import { requireMerchant } from "@/lib/auth";
import type { Collection } from "@/lib/types";

export default async function CollectionsPage() {
  const { store, db } = await requireMerchant();
  const { data } = await db.from("collections").select("*").eq("store_id", store.id).order("created_at");
  const collections = (data ?? []) as Collection[];
  const counts = await Promise.all(
    collections.map((c) => db.from("products").select("id", { count: "exact", head: true }).eq("store_id", store.id).contains("collection_ids", [c.id])),
  );

  return (
    <div>
      <PageHeader
        title="المجموعات"
        actions={
          <Link href="/dashboard/collections/new" className="btn">
            أنشئ مجموعة
          </Link>
        }
      />
      {collections.length === 0 ? (
        <EmptyState
          title="رتّب منتجاتك بمجموعات"
          text="مثلاً: وصل حديثاً، عروض، أطقم كاملة. المجموعات بتظهر بالصفحة الرئيسية لمتجرك وإلها صفحة خاصة."
          action={
            <Link href="/dashboard/collections/new" className="btn">
              أنشئ مجموعة
            </Link>
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="bg-[#f7f7f7] text-right text-xs text-muted">
              <tr>
                <th className="p-2 font-medium">المجموعة</th>
                <th className="p-2 font-medium">المنتجات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {collections.map((c, i) => (
                <tr key={c.id} className="hover:bg-[#f7f7f7]">
                  <td className="p-2">
                    <Link href={`/dashboard/collections/${c.id}`} className="flex items-center gap-3 font-semibold hover:underline">
                      {c.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.image} alt="" className="h-10 w-10 rounded-lg object-cover" />
                      ) : (
                        <span className="h-10 w-10 rounded-lg bg-[#e3e3e3]" />
                      )}
                      {c.title}
                    </Link>
                  </td>
                  <td className="p-2 text-muted">{counts[i].count ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
