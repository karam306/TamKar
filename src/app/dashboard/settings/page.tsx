import { requireMerchant } from "@/lib/auth";
import { SettingsForm } from "./form";

export default async function SettingsPage() {
  const { store, user } = await requireMerchant();
  const paid = store.paid_until ? new Date(store.paid_until).toLocaleDateString("en-GB") : null;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl">الإعدادات</h1>
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
      <section className="space-y-2 rounded-theme bg-white p-5 text-sm">
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
