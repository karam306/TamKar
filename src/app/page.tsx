import Link from "next/link";
import { demoStores } from "@/lib/demo-data";

const platform = process.env.NEXT_PUBLIC_PLATFORM_NAME || "TamKar";

const features = [
  { icon: "⚡", title: "متجرك جاهز بدقائق", text: "اختار قالب، ضيف منتجاتك، وابدأ تبيع. بدون مبرمج وبدون تعقيد." },
  { icon: "💵", title: "الدفع عند الاستلام", text: "زبونك بيطلب من الموبايل وبيدفع لما يوصله الطلب." },
  { icon: "💬", title: "الطلبات على واتساب", text: "كل طلب بيوصلك مرتب على واتساب، بالاسم والعنوان والمجموع." },
  { icon: "📱", title: "سريع على الموبايل", text: "مصمم ليفتح بسرعة حتى على إنترنت ضعيف." },
  { icon: "🎨", title: "قوالب جاهزة", text: "غيّر الألوان والصور والنصوص وترتيب الأقسام بكبسة زر." },
  { icon: "🌐", title: "دومينك الخاص", text: "ابدأ برابط مجاني، واربط دومينك الخاص وقت ما بدك." },
];

const themeNames: Record<string, string> = { classic: "القالب الكلاسيكي", bold: "القالب الجريء", soft: "القالب الناعم" };

export default function PlatformHome() {
  return (
    <div data-theme="classic" className="font-sans">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <div className="text-2xl font-bold text-primary">{platform}</div>
        <div className="flex items-center gap-2 text-sm">
          <Link href="/login" className="px-3 py-2 text-muted hover:text-text">
            دخول
          </Link>
          <Link href="/signup" className="btn !py-2 text-sm">
            افتح متجرك
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-4 py-20 text-center">
        <h1 className="mb-5 text-4xl leading-tight sm:text-6xl">افتح متجرك أونلاين، وخلّي الطلبات توصلك</h1>
        <p className="mx-auto mb-8 max-w-2xl text-lg leading-8 text-muted">
          منصة سورية لبناء المتاجر الإلكترونية. متجر كامل بالعربي، دفع عند الاستلام، والطلبات بتوصلك على واتساب.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/signup" className="btn text-lg">
            افتح متجرك مجاناً
          </Link>
          <a href="#demos" className="btn btn-outline text-lg">
            شوف متاجر تجريبية
          </a>
        </div>
      </section>

      <section className="bg-surface py-16">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-theme bg-white p-6">
              <div className="mb-3 text-3xl">{f.icon}</div>
              <h3 className="mb-2 text-lg">{f.title}</h3>
              <p className="leading-7 text-muted">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="demos" className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="mb-2 text-center text-3xl">متاجر تجريبية</h2>
        <p className="mb-8 text-center text-muted">نفس المنصة، ثلاث قوالب مختلفة. افتح أي واحد وجرب تطلب.</p>
        <div className="grid gap-4 sm:grid-cols-3">
          {demoStores.map((s) => (
            <Link key={s.slug} href={`/s/${s.slug}`} data-theme={s.theme} className="group overflow-hidden rounded-theme border border-black/10 bg-bg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={(s.sections.find((x) => x.type === "hero") as { image?: string } | undefined)?.image} alt="" className="aspect-[2/1] w-full object-cover" />
              <div className="p-5 font-sans">
                <div className="text-xs text-muted">{themeNames[s.theme]}</div>
                <div className="text-xl font-bold text-primary">{s.name}</div>
                <div className="text-sm text-muted">{s.tagline}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <footer className="border-t border-black/5 py-8 text-center text-sm text-muted">© {platform}</footer>
    </div>
  );
}
