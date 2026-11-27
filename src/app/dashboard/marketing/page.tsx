import { Card, PageHeader } from "@/components/admin-ui";
import { requireOwner } from "@/lib/auth";
import { CopyLink } from "../copy-link";
import { MetaForm } from "./form";
import { CancelRequest, RequestForm } from "./request-form";
import { isPro } from "@/lib/plans";
import { ProGate } from "@/components/pro-gate";
import { getStoreMeta, isManagedActive } from "@/lib/meta-managed";

const SUPPORT = process.env.PLATFORM_SUPPORT_WHATSAPP;

// Two ways to connect Meta (Facebook and Instagram ads):
//   1. The Kun team connects it from the Kun business account.
//   2. The merchant pastes their own pixel and adds the catalog link themselves.
// Both are on the Pro plan only.
export default async function MarketingPage() {
  const { store } = await requireOwner();
  if (!isPro(store))
    return (
      <div className="space-y-4">
        <PageHeader title="إعلانات فيسبوك وإنستغرام" back="/dashboard/settings/advanced" />
        <ProGate feature="ربط إعلانات فيسبوك وإنستغرام" />
      </div>
    );
  const s = store as typeof store & { meta_pixel_id?: string | null; meta_capi_token?: string | null };
  const { row: meta, missing } = await getStoreMeta(store.id);
  const managed = isManagedActive(meta);
  const ask = (t: string) => (SUPPORT ? `https://wa.me/${SUPPORT}?text=${encodeURIComponent(t)}` : null);
  const feed = `/api/feed/${store.slug}.csv`;

  if (managed) {
    const link = ask(`مرحباً، لدي سؤال عن ربط إعلانات Meta لمتجري (${store.name})`);
    return (
      <div className="space-y-4">
        <PageHeader title="إعلانات فيسبوك وإنستغرام" back="/dashboard/settings/advanced" />
        <Card title="✓ متجرك مربوط عبر فريق كُن">
          <div className="space-y-2 text-[13px]">
            <p>يرسل متجرك إلى Meta تلقائياً مشاهدات المنتجات والإضافة إلى السلة والطلبات، وتصل منتجاتك إلى كتالوج الإعلانات فور حفظها.</p>
            <p className="text-muted">لا تحتاج إلى أي إعداد من جهتك. صفحتك على فيسبوك وإنستغرام تبقى ملكك بالكامل.</p>
            {meta?.last_sync_at && (
              <p className="text-muted">آخر إرسال للمنتجات: {new Date(meta.last_sync_at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}</p>
            )}
            {link && (
              <a href={link} target="_blank" rel="noopener noreferrer" className="btn btn-outline inline-block">
                تواصل معنا بخصوص الإعلانات
              </a>
            )}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title="إعلانات فيسبوك وإنستغرام" back="/dashboard/settings/advanced" />
      <p className="text-[13px] text-muted">اختر إحدى طريقتين لربط متجرك بإعلانات Meta.</p>

      <Card title="الطريقة الأولى: يتولى فريق كُن الربط (الأسهل)">
          <div className="space-y-3 text-[13px]">
            <ul className="list-inside list-disc space-y-1">
              <li>دون أي خطوات تقنية من جهتك.</li>
              <li>نجهّز لك التتبع وكتالوج المنتجات، وتُحدَّث المنتجات في الإعلانات فور تعديلها.</li>
              <li>كل ما عليك: الموافقة على طلب وصول واحد لصفحتك. الصفحة تبقى ملكك، ويمكنك إلغاء الوصول متى شئت.</li>
            </ul>
            {missing ? (
              ask(`مرحباً، أرغب في أن يتولى فريق كُن ربط متجري (${store.name}) بإعلانات فيسبوك وإنستغرام`) && (
                <a
                  href={ask(`مرحباً، أرغب في أن يتولى فريق كُن ربط متجري (${store.name}) بإعلانات فيسبوك وإنستغرام`)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn inline-block"
                >
                  اطلب الربط عبر واتساب
                </a>
              )
            ) : meta?.status === "requested" ? (
              <div className="space-y-2 rounded-lg bg-[#fff8e6] p-3">
                <p>✓ وصل طلبك إلى فريق كُن، وسنتواصل معك عبر واتساب لإكمال الربط.</p>
                <CancelRequest />
              </div>
            ) : (
              <RequestForm pageUrl={meta?.page_url ?? ""} />
            )}
          </div>
        </Card>

      <Card title="الطريقة الثانية: اربط حسابك بنفسك">
        <div className="space-y-6">
            <div>
              <div className="mb-1 text-[13px] font-semibold">1. البيكسل و Conversions API</div>
              <p className="mb-3 text-[13px] text-muted">
                بعد إدخالهما، يرسل المتجر إلى Meta تلقائياً: مشاهدة المنتج، والإضافة إلى السلة، وبدء الطلب، والشراء مع قيمته. ويرسل أيضاً حدث OrderDelivered عند تحديد
                الطلب &quot;تم التوصيل&quot;، لقياس المبيعات الفعلية.
              </p>
              <MetaForm pixel={s.meta_pixel_id ?? ""} hasToken={Boolean(s.meta_capi_token)} />
            </div>

            <div>
              <div className="mb-1 text-[13px] font-semibold">2. كتالوج المنتجات</div>
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
                يوجد اسم المجموعة في الحقل <b dir="ltr">custom_label_0</b>. أنشئ Product Set مرة واحدة بعامل التصفية:{" "}
                <span dir="ltr">Custom label 0 contains &quot;اسم المجموعة&quot;</span>، وسيظهر فيه تلقائياً كل منتج يُضاف إلى المجموعة في المتجر. أما نوع المنتج فيوجد في{" "}
                <b dir="ltr">product_type</b>.
              </div>
            </div>
          </div>
      </Card>
    </div>
  );
}
