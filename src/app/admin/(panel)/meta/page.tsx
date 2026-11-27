import Link from "next/link";
import { Card, PageHeader } from "@/components/admin-ui";
import { metaConfig } from "@/lib/meta-managed";
import { supabaseAdmin } from "@/lib/supabase";
import { TestButton } from "./test-button";

const STATUS_LABEL: Record<string, string> = { requested: "طلب الربط", active: "مفعّل", stopped: "متوقف", off: "غير مفعّل" };

export default async function AdminMetaPage() {
  const cfg = metaConfig();
  const admin = supabaseAdmin();
  const { data: rows, error } = await admin.from("store_meta").select("store_id, mode, status, requested_at, last_error").neq("status", "off");
  const ids = (rows ?? []).map((r) => r.store_id as string);
  const { data: stores } = ids.length ? await admin.from("stores").select("id, name, slug").in("id", ids) : { data: [] };
  const name = (id: string) => stores?.find((s) => s.id === id)?.name ?? id;

  const env = [
    { key: "META_SYSTEM_TOKEN", ok: Boolean(process.env.META_SYSTEM_TOKEN), note: "رمز مستخدم النظام" },
    { key: "META_BUSINESS_ID", ok: Boolean(process.env.META_BUSINESS_ID), note: "رقم النشاط التجاري" },
    { key: "META_AD_ACCOUNT_ID", ok: Boolean(process.env.META_AD_ACCOUNT_ID), note: "رقم حساب الإعلانات (اختياري لكنه مستحسن)" },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="ربط Meta التلقائي" />

      <Card title="الحالة">
        <ul className="space-y-1.5 text-[13px]">
          <li>{error ? "✗ لم يُنفَّذ التحديث 012 في Supabase بعد" : "✓ قاعدة البيانات جاهزة (التحديث 012)"}</li>
          {env.map((e) => (
            <li key={e.key}>
              {e.ok ? "✓" : "✗"} <b dir="ltr">{e.key}</b>: {e.note}
            </li>
          ))}
        </ul>
        {cfg && (
          <div className="mt-3">
            <TestButton />
          </div>
        )}
      </Card>

      <Card title="المتاجر">
        {(rows ?? []).length === 0 ? (
          <p className="text-[13px] text-muted">لا توجد متاجر طلبت الربط أو فُعِّل لها بعد. التفعيل يكون من صفحة كل متجر.</p>
        ) : (
          <ul className="divide-y divide-black/5 text-[13px]">
            {(rows ?? []).map((r) => (
              <li key={r.store_id as string} className="flex items-center justify-between gap-2 py-2">
                <Link href={`/admin/stores/${r.store_id}`} className="font-semibold underline">
                  {name(r.store_id as string)}
                </Link>
                <span className="text-muted">
                  {STATUS_LABEL[r.status as string]}
                  {r.last_error ? " · يوجد خطأ" : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="دليل الإعداد (مرة واحدة فقط)">
        <div className="space-y-5 text-[13px] leading-7">
          <p className="text-muted">
            الفكرة: حساب واحد باسم كُن على Meta، وبداخله بيكسل وكتالوج لكل متجر. المنصة تنشئها بنفسها عبر «مستخدم نظام». خصص لهذا ربع ساعة من الكمبيوتر، لا من الهاتف.
          </p>

          <Step n={1} title="أنشئ حساب النشاط التجاري لكُن">
            <li>
              افتح{" "}
              <A href="https://business.facebook.com/overview">business.facebook.com</A> وسجّل الدخول بحسابك على فيسبوك.
            </li>
            <li>إذا لم يكن لديك نشاط تجاري، اضغط «إنشاء حساب» واكتب الاسم: Kun Stores. وإذا كان لديك واحد تستخدمه لعملائك، أنشئ واحداً جديداً لكُن حتى تبقى الأمور منفصلة.</li>
          </Step>

          <Step n={2} title="انسخ رقم النشاط التجاري">
            <li>
              افتح <A href="https://business.facebook.com/settings/info">إعدادات النشاط التجاري، ثم معلومات النشاط التجاري</A>.
            </li>
            <li>
              انسخ الرقم الظاهر تحت «معرّف النشاط التجاري» (Business ID). هذا هو <b dir="ltr">META_BUSINESS_ID</b>.
            </li>
          </Step>

          <Step n={3} title="أنشئ حساب إعلانات أو اختر واحداً">
            <li>
              في <A href="https://business.facebook.com/settings/ad-accounts">الإعدادات، ثم الحسابات، ثم حسابات الإعلانات</A>: اضغط «إضافة» ثم «إنشاء حساب إعلانات جديد».
            </li>
            <li>اختر العملة الدولار، والمنطقة الزمنية لدمشق، وأضف بطاقتك للدفع.</li>
            <li>
              انسخ رقم الحساب (الأرقام فقط، دون act_). هذا هو <b dir="ltr">META_AD_ACCOUNT_ID</b>.
            </li>
          </Step>

          <Step n={4} title="أنشئ تطبيقاً للمنصة">
            <li>
              افتح <A href="https://developers.facebook.com/apps">developers.facebook.com/apps</A> واضغط «إنشاء تطبيق» (Create App).
            </li>
            <li>الاسم: Kun Stores Platform. وعند سؤالك عن حالة الاستخدام اختر «أخرى» (Other)، ثم النوع «أعمال» (Business).</li>
            <li>عند سؤالك عن حساب النشاط التجاري، اختر Kun Stores الذي أنشأته في الخطوة 1.</li>
            <li>لا حاجة لمراجعة التطبيق من Meta، لأنه سيعمل على أصول نشاطك التجاري فقط.</li>
          </Step>

          <Step n={5} title="أنشئ مستخدم النظام">
            <li>
              افتح <A href="https://business.facebook.com/settings/system-users">الإعدادات، ثم المستخدمون، ثم مستخدمو النظام</A>.
            </li>
            <li>اضغط «إضافة»، والاسم: kun-platform، والدور: مسؤول (Admin).</li>
            <li>
              اضغط «تعيين الأصول» (Assign assets): من «التطبيقات» اختر Kun Stores Platform مع التحكم الكامل، ومن «حسابات الإعلانات» اختر حسابك مع التحكم الكامل.
            </li>
          </Step>

          <Step n={6} title="أنشئ الرمز">
            <li>في صفحة مستخدم النظام نفسها، اضغط «إنشاء رمز» (Generate token) واختر التطبيق Kun Stores Platform.</li>
            <li>
              مدة الصلاحية: «أبداً» (Never). والصلاحيات: <b dir="ltr">ads_management</b> و<b dir="ltr">business_management</b> و<b dir="ltr">catalog_management</b>.
            </li>
            <li>
              انسخ الرمز فوراً واحفظه في مكان آمن، لأنه لا يظهر مرة أخرى. هذا هو <b dir="ltr">META_SYSTEM_TOKEN</b>. لا ترسله لأحد.
            </li>
          </Step>

          <Step n={7} title="أضف الرموز الثلاثة إلى Vercel">
            <li>
              افتح <A href="https://vercel.com/dashboard">vercel.com</A>، ثم المشروع tam-kar، ثم Settings في الأعلى، ثم Environment Variables من القائمة الجانبية.
            </li>
            <li>
              أضف كل واحد على حدة: في خانة Key اكتب الاسم (مثل <b dir="ltr">META_SYSTEM_TOKEN</b>)، وفي خانة Value الصق القيمة، ثم Save.
            </li>
            <li>بعد إضافة الثلاثة: افتح Deployments من الأعلى، واضغط النقاط الثلاث بجانب أول نشر، ثم Redeploy.</li>
          </Step>

          <Step n={8} title="نفّذ تحديث قاعدة البيانات">
            <li>
              افتح Supabase، ثم مشروع KaramStore، ثم SQL Editor من القائمة الجانبية، ثم New query.
            </li>
            <li>
              الصق محتوى الملف <b dir="ltr">supabase/012_meta_managed.sql</b> واضغط Run.
            </li>
          </Step>

          <Step n={9} title="اختبر">
            <li>ارجع إلى هذه الصفحة: يجب أن تظهر العلامات ✓ في الأعلى، ثم اضغط «اختبار الاتصال».</li>
            <li>بعدها افتح أي متجر من «المتاجر» واضغط «تفعيل الربط التلقائي». جرّبه أولاً على متجر تجريبي.</li>
          </Step>
        </div>
      </Card>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 font-semibold">
        {n}. {title}
      </div>
      <ul className="list-inside list-disc space-y-1">{children}</ul>
    </div>
  );
}

function A({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
      {children} ↗
    </a>
  );
}
