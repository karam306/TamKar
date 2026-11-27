import Link from "next/link";
import { PageHeader } from "@/components/admin-ui";
import { requireOwner } from "@/lib/auth";
import { isPro } from "@/lib/plans";
import { getStoreMeta, isManagedActive } from "@/lib/meta-managed";

/** Everything most merchants never need to touch, in one place. */
export default async function AdvancedSettingsPage() {
  const { store } = await requireOwner();
  const s = store as typeof store & { meta_pixel_id?: string | null };
  const { row: meta } = await getStoreMeta(store.id);
  const metaStatus = !isPro(store)
    ? "🔒 احترافي"
    : isManagedActive(meta)
    ? "✓ عبر فريق كُن"
    : meta?.status === "requested"
      ? "طلبك قيد التنفيذ"
      : s.meta_pixel_id
        ? "✓ مربوط"
        : null;
  const items = [
    {
      href: "/dashboard/marketing",
      icon: "📈",
      title: "إعلانات فيسبوك وإنستغرام",
      text: "اربط متجرك بإعلانات Meta: يتولى فريق كُن الربط عنك، أو تربطه بنفسك عبر البيكسل وكتالوج المنتجات.",
      status: metaStatus,
    },
    { href: "/dashboard/seo", icon: "🔎", title: "Google ومواقع التواصل", text: "ظهور متجرك في بحث Google، وصورة المشاركة، وروابط حساباتك." },
    { href: "/dashboard/products/import", icon: "📊", title: "استيراد وتصدير Excel", text: "إضافة عدد كبير من المنتجات أو تعديلها دفعة واحدة من ملف Excel.", status: !isPro(store) ? "🔒 احترافي" : null },
    { href: "/dashboard/navigation", icon: "🧭", title: "قوائم المتجر", text: "الروابط في أعلى المتجر وأسفله. تأتي جاهزة، ويمكنك تعديلها." },
  ];
  return (
    <div>
      <PageHeader title="إعدادات متقدمة" back="/dashboard/settings" />
      <p className="mb-4 text-[13px] text-muted">يعمل متجرك بشكل كامل دون الحاجة إلى تعديل أي إعداد هنا.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((i) => (
          <Link key={i.href} href={i.href} className="card flex gap-3 p-4 transition hover:shadow-md">
            <span className="text-2xl">{i.icon}</span>
            <span className="flex-1">
              <span className="flex items-center justify-between gap-2">
                <b className="text-sm">{i.title}</b>
                {i.status && <span className={`badge ${i.status.startsWith("🔒") ? "bg-[#f4f0ff] text-[#5700d1]" : "bg-[#affebf] text-[#014b40]"}`}>{i.status}</span>}
              </span>
              <span className="mt-1 block text-[13px] text-muted">{i.text}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
