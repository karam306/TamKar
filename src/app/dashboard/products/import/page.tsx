import { PageHeader } from "@/components/admin-ui";
import { ProGate } from "@/components/pro-gate";
import { isPro } from "@/lib/plans";
import { requireOwner } from "@/lib/auth";
import { AiListImport } from "./ai-list-import";
import { ImportForm } from "./import-form";

export default async function ImportPage() {
  const { store, db } = await requireOwner();
  if (!isPro(store))
    return (
      <div className="space-y-4">
        <PageHeader title="استيراد وتصدير المنتجات" back="/dashboard/products" />
      <section className="card space-y-3 p-4">
        <h2 className="text-sm font-semibold">✨ استيراد من صورة قائمة الأسعار</h2>
        <AiListImport unit={store.currency === "SYP" ? "ل.س" : "$"} />
      </section>
        <ProGate feature="الاستيراد والتصدير من Excel" />
      </div>
    );
  const { count } = await db.from("products").select("id", { count: "exact", head: true }).eq("store_id", store.id);
  return (
    <div className="space-y-4">
      <PageHeader title="استيراد وتصدير المنتجات" back="/dashboard/products" />
      <section className="card space-y-3 p-4">
        <h2 className="text-sm font-semibold">✨ استيراد من صورة قائمة الأسعار</h2>
        <AiListImport unit={store.currency === "SYP" ? "ل.س" : "$"} />
      </section>

      <section className="card space-y-3 p-4">
        <h2 className="text-sm font-semibold">استيراد من Excel</h2>
        <ol className="list-inside list-decimal space-y-1 text-[13px] text-muted">
          <li>
            نزّل{" "}
            <a href="/api/export/products?template=1" className="font-semibold text-[#005bd3] hover:underline">
              ملف النموذج
            </a>{" "}
            واملأه بمنتجاتك، سطراً لكل منتج.
          </li>
          <li>الأعمدة: الاسم، الوصف، السعر، السعر قبل الخصم، الكمية، SKU، النوع، الحالة. الاسم والسعر فقط إلزاميان.</li>
          <li>إذا كان رمز SKU موجوداً مسبقاً، يُحدَّث المنتج (السعر والكمية) بدلاً من إضافته مرتين.</li>
          <li>لا تُضاف الصور من الملف، بل من صفحة كل منتج لاحقاً.</li>
        </ol>
        <ImportForm />
      </section>

      <section className="card space-y-3 p-4">
        <h2 className="text-sm font-semibold">تصدير</h2>
        <p className="text-[13px] text-muted">نزّل جميع منتجاتك ({count ?? 0}) في ملف Excel، وهو مفيد للنسخ الاحتياطي أو لتعديل الأسعار دفعة واحدة ثم إعادة استيرادها.</p>
        <a href="/api/export/products" className="btn btn-outline">
          تنزيل ملف المنتجات
        </a>
      </section>
    </div>
  );
}
