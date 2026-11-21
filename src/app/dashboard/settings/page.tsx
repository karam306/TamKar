import Link from "next/link";
import { requireMerchant } from "@/lib/auth";
import { SettingsForm } from "./form";

export default async function SettingsPage() {
  const { store, user } = await requireMerchant();
  const paid = store.paid_until ? new Date(store.paid_until).toLocaleDateString("en-GB") : null;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl">الإعدادات</h1>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/dashboard/settings/shipping" className="card flex items-center gap-3 p-4 hover:shadow-md">
          <span className="text-2xl">{store.shipping?.delivery ? "🚚" : "🏪"}</span>
          <span className="flex-1">
            <b className="block text-sm">الاستلام والتوصيل</b>
            <span className="text-[13px] text-muted">{store.shipping?.delivery ? "استلام من المحل + توصيل" : "استلام من المحل بس"}</span>
          </span>
          <span className="text-muted">←</span>
        </Link>
        <Link href="/dashboard/settings/advanced" className="card flex items-center gap-3 p-4 hover:shadow-md">
          <span className="text-2xl">⚙️</span>
          <span className="flex-1">
            <b className="block text-sm">إعدادات متقدمة</b>
            <span className="text-[13px] text-muted">Meta Pixel، Google، Excel، القوائم</span>
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
        }}
      />
      <section className="space-y-2 card p-5 text-sm">
        <h2 className="text-lg">الحساب والاشتراك</h2>
        <p>
          الإيميل: <span dir="ltr">{user.email}</span>
        </p>
        <p>
          رابط المتجر: <span dir="ltr">{store.slug}</span>
        </p>
        <p>الباقة: {store.plan === "trial" ? "فترة تجريبية" : store.plan}</p>
        {paid && <p>الاشتراك فعّال لغاية: {paid}</p>}
      </section>
    </div>
  );
}
