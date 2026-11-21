import Link from "next/link";
import { PageHeader } from "@/components/admin-ui";
import { requireOwner } from "@/lib/auth";
import { isPro } from "@/lib/plans";

/** Everything most merchants never need to touch, in one place. */
export default async function AdvancedSettingsPage() {
  const { store } = await requireOwner();
  const s = store as typeof store & { meta_pixel_id?: string | null };
  const items = [
    {
      href: "/dashboard/marketing",
      icon: "📈",
      title: "Meta Pixel وكتالوج المنتجات",
      text: "لربط متجرك بإعلانات فيسبوك وانستغرام. إذا حدا عم يعملك إعلاناتك، هو بيعبي هالقسم.",
      status: !isPro(store) ? "🔒 احترافي" : s.meta_pixel_id ? "✓ مربوط" : null,
    },
    { href: "/dashboard/seo", icon: "🔎", title: "Google والسوشال ميديا", text: "كيف بيظهر متجرك ببحث Google، صورة المشاركة، وروابط حساباتك." },
    { href: "/dashboard/products/import", icon: "📊", title: "استيراد وتصدير Excel", text: "ضيف أو عدّل كتير منتجات مرة وحدة من ملف Excel.", status: !isPro(store) ? "🔒 احترافي" : null },
    { href: "/dashboard/navigation", icon: "🧭", title: "قوائم المتجر", text: "الروابط اللي فوق وتحت بالمتجر. جاهزة من الأول، غيّرها إذا بدك." },
  ];
  return (
    <div>
      <PageHeader title="إعدادات متقدمة" back="/dashboard/settings" />
      <p className="mb-4 text-[13px] text-muted">متجرك شغال تمام بدون ما تلمس شي من هون.</p>
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
