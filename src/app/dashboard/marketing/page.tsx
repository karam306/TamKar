import { Card, PageHeader } from "@/components/admin-ui";
import { requireOwner } from "@/lib/auth";
import { CopyLink } from "../copy-link";
import { MetaForm } from "./form";
import { isPro } from "@/lib/plans";
import { ProGate } from "@/components/pro-gate";

export default async function MarketingPage() {
  const { store } = await requireOwner();
  if (!isPro(store))
    return (
      <div className="space-y-4">
        <PageHeader title="Meta Pixel وكتالوج المنتجات" back="/dashboard/settings/advanced" />
        <ProGate feature="ربط إعلانات فيسبوك وإنستغرام" />
      </div>
    );
  const s = store as typeof store & { meta_pixel_id?: string | null; meta_capi_token?: string | null };
  const feed = `/api/feed/${store.slug}.csv`;
  return (
    <div className="space-y-4">
      <PageHeader title="Meta Pixel وكتالوج المنتجات" back="/dashboard/settings/advanced" />

      <Card title="1. البيكسل و Conversions API">
        <p className="mb-3 text-[13px] text-muted">
          بعد إدخالهما، يرسل المتجر إلى Meta تلقائياً: مشاهدة المنتج، والإضافة إلى السلة، وبدء الطلب، والشراء مع قيمته. ويرسل أيضاً حدث OrderDelivered عند تحديد الطلب
          &quot;تم التوصيل&quot;، لقياس المبيعات الفعلية.
        </p>
        <MetaForm pixel={s.meta_pixel_id ?? ""} hasToken={Boolean(s.meta_capi_token)} />
      </Card>

      <Card title="2. كتالوج المنتجات">
        <p className="mb-3 text-[13px] text-muted">يحتوي هذا الرابط على جميع منتجاتك ويُحدَّث تلقائياً. أضفه مرة واحدة في Commerce Manager:</p>
        <CopyLink url={feed} />
        <ol className="mt-4 list-inside list-decimal space-y-1.5 text-[13px]">
          <li>افتح Commerce Manager واختر الكتالوج (أو أنشئ كتالوجاً جديداً من نوع E-commerce).</li>
          <li>من القائمة: Catalogue ثم Data sources ثم Add items، واختر Data feed.</li>
          <li>اختر Use a URL، والصق الرابط أعلاه.</li>
          <li>في الجدولة اختر Hourly (كل ساعة)، والعملة {store.currency}.</li>
          <li>اضغط Upload، وستظهر منتجاتك بعد دقائق.</li>
        </ol>
        <div className="mt-4 rounded-lg bg-[#f7f7f7] p-3 text-[13px]">
          <div className="mb-1 font-semibold">المجموعات كـ Product Sets</div>
          يوجد اسم المجموعة في الحقل <b dir="ltr">custom_label_0</b>. أنشئ Product Set مرة واحدة بعامل التصفية: <span dir="ltr">Custom label 0 contains &quot;اسم المجموعة&quot;</span>،
          وسيظهر فيه تلقائياً كل منتج يُضاف إلى المجموعة في المتجر. أما نوع المنتج فيوجد في <b dir="ltr">product_type</b>.
        </div>
      </Card>
    </div>
  );
}
