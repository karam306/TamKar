import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/admin-ui";
import { requireAccess } from "@/lib/auth";
import type { StorePage } from "@/lib/types";

export default async function PagesList() {
  const { store, db } = await requireAccess("design");
  const { data } = await db
    .from("pages")
    .select("*")
    .eq("store_id", store.id)
    .order("created_at");
  const pages = (data ?? []) as StorePage[];
  return (
    <div>
      <PageHeader
        title="الصفحات"
        actions={
          <Link href="/dashboard/pages/new" className="btn">
            أضف صفحة
          </Link>
        }
      />
      {pages.length === 0 ? (
        <EmptyState
          title="صفحات متجرك"
          text="مثل: من نحن، التوصيل والدفع، سياسة الإرجاع. بتظهر بأسفل المتجر."
          action={
            <Link href="/dashboard/pages/new" className="btn">
              أضف صفحة
            </Link>
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="bg-[#f7f7f7] text-right text-xs text-muted">
              <tr>
                <th className="p-2 font-medium">الصفحة</th>
                <th className="p-2 font-medium">الرابط</th>
                <th className="p-2 font-medium">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {pages.map((p) => (
                <tr key={p.id} className="relative hover:bg-[#f7f7f7]">
                  <td className="p-2 font-semibold">
                    <Link
                      href={`/dashboard/pages/${p.id}`}
                      className="after:absolute after:inset-0"
                    >
                      {p.title}
                    </Link>
                  </td>
                  <td
                    className="p-2 text-muted"
                    dir="ltr"
                    style={{ textAlign: "right" }}
                  >
                    /pages/{p.handle}
                  </td>
                  <td className="p-2">
                    <span
                      className={`badge ${p.published ? "bg-[#affebf] text-[#014b40]" : "bg-[#e3e3e3] text-[#616161]"}`}
                    >
                      {p.published ? "ظاهرة" : "مخفية"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
