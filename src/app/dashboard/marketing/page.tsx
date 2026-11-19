import { Card, PageHeader } from "@/components/admin-ui";
import { requireMerchant } from "@/lib/auth";
import { CopyLink } from "../copy-link";
import { MetaForm } from "./form";

export default async function MarketingPage() {
  const { store } = await requireMerchant();
  const s = store as typeof store & { meta_pixel_id?: string | null; meta_capi_token?: string | null };
  const feed = `/api/feed/${store.slug}.csv`;
  return (
    <div className="space-y-4">
      <PageHeader title="التسويق: Meta (فيسبوك وإنستغرام)" />

      <Card title="1. البيكسل و Conversions API">
        <p className="mb-3 text-[13px] text-muted">
          بعد ما تحطهم، المتجر بيبعت لـ Meta تلقائياً: مشاهدة المنتج، الإضافة للسلة، بدء الطلب، والشراء مع قيمته. وكمان حدث OrderDelivered لما تعلّم الطلب
          &quot;تم التوصيل&quot;، لتقيس المبيعات الحقيقية.
        </p>
        <MetaForm pixel={s.meta_pixel_id ?? ""} hasToken={Boolean(s.meta_capi_token)} />
      </Card>

      <Card title="2. كتالوج المنتجات">
        <p className="mb-3 text-[13px] text-muted">هاد الرابط فيه كل منتجاتك وبيتحدث لحاله. بتحطه مرة وحدة بـ Commerce Manager:</p>
        <CopyLink url={feed} />
        <ol className="mt-4 list-inside list-decimal space-y-1.5 text-[13px]">
          <li>افتح Commerce Manager واختار الكتالوج (أو أنشئ كتالوج جديد من نوع E-commerce).</li>
          <li>من القائمة: Catalogue ثم Data sources ثم Add items، واختار Data feed.</li>
          <li>اختار Use a URL، والصق الرابط فوق.</li>
          <li>بالجدولة اختار Hourly (كل ساعة)، والعملة {store.currency}.</li>
          <li>اضغط Upload، وبعد دقائق بتظهر منتجاتك.</li>
        </ol>
        <div className="mt-4 rounded-lg bg-[#f7f7f7] p-3 text-[13px]">
          <div className="mb-1 font-semibold">المجموعات كـ Product Sets</div>
          اسم المجموعة موجود بحقل <b dir="ltr">custom_label_0</b>. اعمل Product Set مرة وحدة بفلتر: <span dir="ltr">Custom label 0 contains &quot;اسم المجموعة&quot;</span>،
          وكل منتج بينضاف للمجموعة بالمتجر بيظهر فيه تلقائياً. ونوع المنتج موجود بـ <b dir="ltr">product_type</b>.
        </div>
      </Card>
    </div>
  );
}
