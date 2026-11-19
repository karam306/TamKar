import { PageHeader } from "@/components/admin-ui";
import { requireMerchant } from "@/lib/auth";
import { ImportForm } from "./import-form";

export default async function ImportPage() {
  const { store, db } = await requireMerchant();
  const { count } = await db.from("products").select("id", { count: "exact", head: true }).eq("store_id", store.id);
  return (
    <div className="space-y-4">
      <PageHeader title="استيراد وتصدير المنتجات" back="/dashboard/products" />

      <section className="card space-y-3 p-4">
        <h2 className="text-sm font-semibold">استيراد من Excel</h2>
        <ol className="list-inside list-decimal space-y-1 text-[13px] text-muted">
          <li>
            نزّل{" "}
            <a href="/api/export/products?template=1" className="font-semibold text-[#005bd3] hover:underline">
              ملف النموذج
            </a>{" "}
            وعبّي منتجاتك فيه، سطر لكل منتج.
          </li>
          <li>الأعمدة: الاسم، الوصف، السعر، السعر قبل الخصم، الكمية، SKU، النوع، الحالة. بس الاسم والسعر إجباريين.</li>
          <li>إذا الـ SKU موجود من قبل، بيتحدث المنتج (السعر والكمية) بدل ما ينضاف مرتين.</li>
          <li>الصور ما بتنضاف من الملف، بتضيفها بعدين من صفحة كل منتج.</li>
        </ol>
        <ImportForm />
      </section>

      <section className="card space-y-3 p-4">
        <h2 className="text-sm font-semibold">تصدير</h2>
        <p className="text-[13px] text-muted">نزّل كل منتجاتك ({count ?? 0}) بملف Excel، مفيد للنسخ الاحتياطي أو لتعديل الأسعار دفعة وحدة وترجعها بالاستيراد.</p>
        <a href="/api/export/products" className="btn btn-outline">
          نزّل ملف المنتجات
        </a>
      </section>
    </div>
  );
}
