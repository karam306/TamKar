import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin-ui";
import { requireAccess } from "@/lib/auth";
import type { StorePage } from "@/lib/types";
import { storeUrl } from "@/lib/urls";
import { deletePage } from "../actions";
import { PageForm } from "../page-form";

export default async function EditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { store, db } = await requireAccess("design");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { data } = await db
    .from("pages")
    .select("*")
    .eq("id", id)
    .eq("store_id", store.id)
    .maybeSingle();
  if (!data) notFound();
  const page = data as StorePage;
  return (
    <div>
      <PageHeader
        title={page.title}
        back="/dashboard/pages"
        actions={
          <a
            href={`${storeUrl(store.slug)}/pages/${page.handle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline"
          >
            معاينة ↗
          </a>
        }
      />
      <PageForm page={page} />
      <details className="card mt-6 p-4 text-[13px]">
        <summary className="cursor-pointer font-semibold text-red-700">
          حذف الصفحة
        </summary>
        <form action={deletePage} className="mt-3">
          <input type="hidden" name="id" value={page.id} />
          <button className="btn !bg-[#c70a24]">حذف</button>
        </form>
      </details>
    </div>
  );
}
