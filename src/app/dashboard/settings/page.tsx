import Link from "next/link";
import { ProGate } from "@/components/pro-gate";
import { isPro, PLAN_LABELS } from "@/lib/plans";
import { requireOwner } from "@/lib/auth";
import { SettingsForm } from "./form";
import { storeWallets, WALLETS } from "@/lib/wallets";
import { storeChat } from "@/lib/telegram";

export default async function SettingsPage() {
  const { store, user } = await requireOwner();
  const tgChat = await storeChat(store.id);
  const paid = store.paid_until ? new Date(store.paid_until).toLocaleDateString("en-GB") : null;
  return (
    <div className="space-y-6">
      <h1 className="text-[1.35rem] font-bold"><span className="hl hl-apricot">الإعدادات</span></h1>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/dashboard/settings/shipping" className="card flex items-center gap-3 p-4 hover:shadow-md">
          <span className="text-2xl">{store.shipping?.delivery ? "🚚" : "🏪"}</span>
          <span className="flex-1">
            <b className="block text-sm">الاستلام والتوصيل</b>
            <span className="text-[13px] text-muted">{store.shipping?.delivery ? "الاستلام من المحل والتوصيل" : "الاستلام من المحل فقط"}</span>
          </span>
          <span className="text-muted">←</span>
        </Link>
        <Link href="/dashboard/settings/payments" className="card flex items-center gap-3 p-4 hover:shadow-md">
          <span className="text-2xl">💳</span>
          <span className="flex-1">
            <b className="block text-sm">طرق الدفع</b>
            <span className="text-[13px] text-muted">
              {storeWallets(store).length ? `نقداً + ${storeWallets(store).map((w) => WALLETS[w.id].short).join("، ")}` : "نقداً عند الاستلام. أضف شام كاش أو سيرياتل كاش"}
            </span>
          </span>
          <span className="text-muted">←</span>
        </Link>
        <Link href="/dashboard/settings/notifications" className="card flex items-center gap-3 p-4 hover:shadow-md">
          <span className="text-2xl">🔔</span>
          <span className="flex-1">
            <b className="block text-sm">إشعارات تيليغرام</b>
            <span className="text-[13px] text-muted">{tgChat ? "✓ مربوط" : "لتصلك الطلبات الجديدة فوراً"}</span>
          </span>
          <span className="text-muted">←</span>
        </Link>
        <Link href="/dashboard/settings/branches" className="card flex items-center gap-3 p-4 hover:shadow-md">
          <span className="text-2xl">🏬</span>
          <span className="flex-1">
            <b className="block text-sm">الفروع {!isPro(store) && "🔒"}</b>
            <span className="text-[13px] text-muted">
              {store.shipping?.branches?.length ? `المحل الرئيسي + ${store.shipping.branches.length} فروع` : "لكل فرع رقم واتساب خاص تصله طلباته"}
            </span>
          </span>
          <span className="text-muted">←</span>
        </Link>
        <Link href="/dashboard/settings/team" className="card flex items-center gap-3 p-4 hover:shadow-md">
          <span className="text-2xl">👥</span>
          <span className="flex-1">
            <b className="block text-sm">الموظفين {!isPro(store) && "🔒"}</b>
            <span className="text-[13px] text-muted">حسابات لموظفيك لإدارة الطلبات</span>
          </span>
          <span className="text-muted">←</span>
        </Link>
        <Link href="/dashboard/settings/advanced" className="card flex items-center gap-3 p-4 hover:shadow-md">
          <span className="text-2xl">⚙️</span>
          <span className="flex-1">
            <b className="block text-sm">إعدادات متقدمة</b>
            <span className="text-[13px] text-muted">إعلانات Meta، Google، Excel، القوائم</span>
          </span>
          <span className="text-muted">←</span>
        </Link>
      </div>
      <SettingsForm
        store={{
          name: store.name,
          tagline: store.tagline ?? "",
          whatsapp: store.whatsapp,
          city: store.city ?? "",
          currency: store.currency,
          delivery_note: store.delivery_note ?? "",
          logo_url: store.logo_url ?? "",
        }}
      />
      <section className="space-y-2 card p-5 text-sm">
        <h2 className="text-base font-bold"><span className="hl hl-mint">الحساب والاشتراك</span></h2>
        <p>
          البريد الإلكتروني: <span dir="ltr">{user.email}</span>
        </p>
        <p>
          رابط المتجر: <span dir="ltr">{store.slug}</span>
        </p>
        <p>الباقة: {PLAN_LABELS[store.plan ?? ""] ?? store.plan}</p>
        {!isPro(store) && <ProGate feature="الموظفين والفروع والفواتير وربط الإعلانات" compact />}
        {paid && <p>الاشتراك فعّال حتى: {paid}</p>}
      </section>
    </div>
  );
}
