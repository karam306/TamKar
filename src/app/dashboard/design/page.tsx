import { requireAccess } from "@/lib/auth";
import { BUSINESS_TYPES } from "@/lib/business-types";
import type { Collection } from "@/lib/types";
import { applyTemplate } from "./actions";
import { storeUrl } from "@/lib/urls";
import { DesignEditor } from "./editor";

export default async function DesignPage() {
  const { store, db } = await requireAccess("design");
  const { data: cols } = await db
    .from("collections")
    .select("id, title")
    .eq("store_id", store.id)
    .order("title");
  return (
    <>
      <details className="card mb-4 p-4 text-[13px]">
        <summary className="cursor-pointer font-semibold">
          ابدأ من قالب جاهز حسب نوع النشاط
        </summary>
        <form
          action={applyTemplate}
          className="mt-3 flex flex-wrap items-center gap-2"
        >
          <select
            name="business_type"
            defaultValue={
              (store as { business_type?: string }).business_type ?? "general"
            }
            className="input !w-64"
          >
            {BUSINESS_TYPES.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>
          <button className="btn">طبّق القالب</button>
          <span className="text-muted">
            بيغيّر الألوان وأقسام الصفحة الرئيسية، وبيضيف الصفحات الناقصة.
            منتجاتك ما بتتأثر.
          </span>
        </form>
      </details>
      <DesignEditor
        collections={(cols ?? []) as Pick<Collection, "id" | "title">[]}
        previewUrl={`/s/${store.slug}`}
        publicUrl={storeUrl(store.slug)}
        initial={{
          theme: store.theme,
          primary_color: store.primary_color ?? "",
          logo_url: store.logo_url ?? "",
          sections: store.sections ?? [],
        }}
      />
    </>
  );
}
