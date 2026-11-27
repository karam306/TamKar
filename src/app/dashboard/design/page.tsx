import { requireAccess } from "@/lib/auth";
import { BUSINESS_TYPES } from "@/lib/business-types";
import type { Collection } from "@/lib/types";
import { applyTemplate } from "./actions";
import { storeUrl } from "@/lib/urls";
import { AiStoreWriter } from "./ai-store-writer";
import { DesignEditor } from "./editor";

export default async function DesignPage({ searchParams }: { searchParams: Promise<{ ai?: string }> }) {
  const { ai } = await searchParams;
  const { store, db } = await requireAccess("design");
  const { data: cols } = await db
    .from("collections")
    .select("id, title")
    .eq("store_id", store.id)
    .order("title");
  return (
    <>
      <AiStoreWriter open={ai === "1"} />
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
          <button className="btn">تطبيق القالب</button>
          <span className="text-muted">
            يغيّر الألوان وأقسام الصفحة الرئيسية، ويضيف الصفحات الناقصة.
            لا تتأثر منتجاتك.
          </span>
        </form>
      </details>
      <DesignEditor
        key={`${store.primary_color}-${JSON.stringify(store.sections ?? []).length}`}
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
