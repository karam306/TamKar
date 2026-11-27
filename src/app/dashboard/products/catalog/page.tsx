import { Card, PageHeader } from "@/components/admin-ui";
import { requireAccess } from "@/lib/auth";

/** Choose what goes in the PDF catalog, then open it in a new tab to save. */
export default async function CatalogChooser() {
  const { store, db } = await requireAccess("products");
  const { data } = await db.from("collections").select("id, title").eq("store_id", store.id).order("created_at");
  const collections = (data ?? []) as { id: string; title: string }[];
  return (
    <div className="space-y-4">
      <PageHeader title="كتالوج PDF" back="/dashboard/products" />
      <Card>
        <p className="mb-4 text-[13px] text-muted">
          ملف واحد يضم صور منتجاتك وأسعارها، ترسله في مجموعات واتساب أو إلى زبون يسأل عن البضاعة. كل منتج في الملف رابط يفتح صفحته في متجرك.
        </p>
        <form action="/catalog" target="_blank" className="space-y-4">
          <label className="block space-y-1 text-sm">
            <span className="font-semibold">المنتجات</span>
            <select name="c" className="input">
              <option value="">كل المنتجات المنشورة</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  مجموعة: {c.title}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="prices" value="1" defaultChecked />
            إظهار الأسعار
          </label>
          <input type="hidden" name="prices" value="0" />
          <button type="submit" className="btn">
            إنشاء الكتالوج
          </button>
        </form>
      </Card>
    </div>
  );
}
