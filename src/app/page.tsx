import Link from "next/link";
import { BRAND_AR, BRAND_FULL, BRAND_FULL_AR } from "@/lib/brand";
import { KunLogo } from "@/components/kun-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { storeUrl } from "@/lib/urls";
import { demoStores } from "@/lib/demo-data";
import { StoryCaptions, StoryPhone } from "@/components/home/story-phone";
import { StoreBuilder, TimeCalculator } from "@/components/home/home-tools";
import { RevealObserver, StickyCta } from "@/components/home/home-motion";

/**
 * Kun's public homepage. Audience: shop owners in Syria, mostly on phones.
 * One job: get them to open a store (or ask us to build it for them).
 *
 * The page tells one story in order:
 * 1. Hero: the promise, and a phone that plays the whole order journey on a loop.
 * 2. The problem: hours lost answering "how much?" (interactive calculator).
 * 3. Try it: build a store preview in 10 seconds, then carry it into signup.
 * 4. How it works, built for local selling, the service, pricing, demo stores, FAQ.
 * Motion is CSS first; the only scripts are the scroll reveal, the builder and the calculator.
 */

const SUPPORT = process.env.PLATFORM_SUPPORT_WHATSAPP;
const helpLink = SUPPORT ? `https://wa.me/${SUPPORT}?text=${encodeURIComponent("مرحباً، أرغب في مساعدتكم لإنشاء متجر على منصة كُن")}` : "/signup";

const kinds = ["حلويات", "ملابس وأحذية", "عطور", "أدوات منزلية", "هواتف وإكسسوارات", "مجوهرات", "مطاعم", "ألعاب أطفال", "قرطاسية", "حواسيب", "هدايا", "أعشاب وبهارات"];

const steps = [
  { title: "أنشئ متجرك", text: "أجب عن بضعة أسئلة: اسم المحل، ونوع نشاطك، ورقم واتساب. يُجهَّز متجرك بقالب يناسب نشاطك.", time: "5 دقائق" },
  { title: "أضف منتجاتك", text: "صورة وسعر واسم لكل منتج، من هاتفك مباشرة. أو أرسلها إلينا ونضيفها عنك.", time: "حسب عدد المنتجات" },
  { title: "شارك الرابط واستقبل الطلبات", text: "ضعه في التعريف على إنستغرام وفي القصص ومجموعات واتساب. تصلك الطلبات منظّمة.", time: "من اليوم الأول" },
];

const local: { icon: IconName; title: string; text: string }[] = [
  { icon: "store", title: "الاستلام من المحل هو الأساس", text: "لا تملك خدمة توصيل؟ لا بأس. يطلب الزبون عبر الإنترنت ويستلم طلبه جاهزاً من المحل." },
  { icon: "cash", title: "الدفع عند الاستلام أو بشام كاش", text: "لا حاجة إلى بطاقات. يدفع الزبون نقداً، أو بالتحويل عبر شام كاش وسيرياتل كاش وMTN كاش إلى حسابك." },
  { icon: "coins", title: "بالليرة أو بالدولار", text: "سعّر منتجاتك بالعملة التي تتعامل بها، وغيّر الأسعار متى شئت." },
  { icon: "signal", title: "سريع على الاتصال الضعيف", text: "صُمّم المتجر ليفتح بسرعة على الهاتف المحمول، حتى مع اتصال ضعيف." },
  { icon: "percent", title: "دون عمولة على مبيعاتك", text: "اشتراك شهري ثابت، وجميع أرباح مبيعاتك لك." },
  { icon: "bell", title: "إشعار فوري بكل طلب", text: "يصلك الطلب على واتساب، وإشعار على تيليغرام إن رغبت، مع لوحة تحكم عربية بسيطة." },
];

const faqs = [
  { q: "هل أحتاج إلى خبرة تقنية؟", a: "لا. إذا كنت تستخدم واتساب وإنستغرام فأنت قادر على إدارة متجرك. وإن فضّلت، نجهّزه عنك بالكامل." },
  { q: "هل يجب أن تكون لدي خدمة توصيل؟", a: "لا. تعمل معظم المحلات بالاستلام من المحل. وإذا بدأت التوصيل لاحقاً، فعّله من الإعدادات وحدّد سعراً لكل مدينة." },
  { q: "كيف يدفع الزبون؟", a: "نقداً عند الاستلام، أو بالتحويل عبر شام كاش أو سيرياتل كاش أو MTN كاش إلى حسابك مباشرة. لا تستلم المنصة أموال الزبائن ولا تحتفظ بها." },
  { q: "ماذا يحدث بعد انتهاء التجربة المجانية؟", a: "إذا قررت الاستمرار، تدفع الاشتراك ويستمر متجرك كما هو. وإن لم ترغب، يتوقف المتجر تلقائياً دون أي رسوم." },
  { q: "ليس لدي وقت لإضافة المنتجات.", a: "يمكننا إضافة منتجاتك وتجهيز المتجر بالكامل، لتتفرغ لاستلام الطلبات. تواصل معنا عبر واتساب." },
  { q: "هل تساعدونني في الوصول إلى الزبائن؟", a: "نعم. نقدّم خدمة إعداد المحتوى وإدارة إعلانات فيسبوك وإنستغرام التي توجّه الزبائن إلى متجرك مباشرة." },
];

export default function PlatformHome() {
  return (
    <div data-ui className="nama font-sans">
      <style>{CSS}</style>
      {/* Hide reveal items only when JavaScript runs, so the page never stays blank. */}
      <script dangerouslySetInnerHTML={{ __html: `document.documentElement.classList.add("kun-js")` }} />
      <RevealObserver />

      <header className="kun-head">
        <div className="nama-wrap flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center" aria-label={BRAND_FULL_AR}>
            <KunLogo lang="ar" className="text-[2.3rem]" />
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <a href="#try" className="hidden px-3 py-2 hover:underline md:inline">
              جرّب الآن
            </a>
            <a href="#how" className="hidden px-3 py-2 hover:underline md:inline">
              طريقة العمل
            </a>
            <a href="#pricing" className="hidden px-3 py-2 hover:underline md:inline">
              الأسعار
            </a>
            <ThemeToggle compact />
            <Link href="/login" className="px-3 py-2 hover:underline">
              دخول
            </Link>
            <Link href="/signup" className="nama-btn whitespace-nowrap !px-4 !py-2 text-sm">
              أنشئ متجرك
            </Link>
          </nav>
        </div>
      </header>

      {/* 1. Hero */}
      <section className="kun-hero">
        <div className="kun-grain" aria-hidden />
        <div className="nama-wrap relative grid items-center gap-12 pb-10 pt-8 lg:grid-cols-[1.25fr_1fr] lg:pb-16 lg:pt-14">
          <div>
            <div className="kun-eyebrow mb-6">
              <span className="kun-dot" /> منصة متاجر إلكترونية للمحلات في سوريا
            </div>
            <h1 className="brand-display mb-6 text-[clamp(2.4rem,5.6vw,3.7rem)] leading-[1.5]">
              <span className="hl hl-apricot hl-draw">كُن حيث يبحث زبائنك.</span>
              <br />
              <span className="hl hl-pist hl-draw" style={{ "--dl": ".55s" } as React.CSSProperties}>
                متجرك. جاهز خلال دقائق.
              </span>
            </h1>
            <p className="kun-rise mb-8 max-w-xl text-lg leading-9 text-[var(--mute)]">
              أنشئ متجراً إلكترونياً عربياً لمحلك، وشارك رابطه على إنستغرام وواتساب. يتصفح الزبون منتجاتك ويطلب من هاتفه، ويصلك الطلب منظّماً، ثم يستلمه من محلك ويدفع.
            </p>
            <div id="hero-cta" className="kun-rise flex flex-wrap gap-3" style={{ "--d": ".15s" } as React.CSSProperties}>
              <Link href="/signup" className="nama-btn kun-shine text-lg">
                ابدأ تجربة مجانية لمدة 14 يوماً
              </Link>
              <a href={helpLink} target={SUPPORT ? "_blank" : undefined} rel="noopener noreferrer" className="nama-btn-ghost text-lg">
                اطلب تجهيز متجرك
              </a>
            </div>
            <ul className="kun-rise mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[var(--mute)]" style={{ "--d": ".3s" } as React.CSSProperties}>
              {["دون بطاقة ائتمان", "دون عمولة على مبيعاتك", "بالعربية بالكامل"].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <span className="kun-check" aria-hidden>
                    ✓
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <StoryPhone />
        </div>

        <div className="nama-wrap relative pb-14">
          <div className="mb-3 text-sm font-semibold text-[var(--mute)]">رحلة الطلب على {BRAND_AR}</div>
          <StoryCaptions />
        </div>
      </section>

      {/* Marquee of shop types */}
      <section className="kun-marquee border-y border-black/10 py-5" aria-label="أنواع المحلات">
        <div className="kun-track">
          {[...kinds, ...kinds].map((k, i) => (
            <span key={i} className="kun-tick" aria-hidden={i >= kinds.length}>
              {k}
              <span className="kun-star" aria-hidden>
                ✦
              </span>
            </span>
          ))}
        </div>
      </section>

      {/* 2. The problem, measured */}
      <section className="nama-wrap py-20">
        <div className="mb-10 max-w-3xl" data-reveal>
          <div className="kun-kicker">لماذا متجر وليس رسائل؟</div>
          <h2 className="nama-display text-3xl sm:text-[2.6rem]">
            <span className="hl hl-butter">كم من وقتك يذهب في الرد على سؤال: كم السعر؟</span>
          </h2>
          <p className="mt-4 text-lg leading-8 text-[var(--mute)]">البيع عبر الرسائل يعني الإجابة عن الأسئلة نفسها مرات كثيرة كل يوم، وزبائن يغادرون قبل أن يصلهم الرد. حرّك المؤشر واحسبها لمحلك.</p>
        </div>
        <TimeCalculator />
      </section>

      {/* 3. Try it */}
      <section id="try" className="nama-band py-20">
        <div className="nama-wrap">
          <div className="mb-10 max-w-3xl" data-reveal>
            <div className="kun-kicker">جرّب قبل أن تسجّل</div>
            <h2 className="nama-display text-3xl sm:text-[2.6rem]">
              <span className="hl hl-mint">شاهد متجرك في عشر ثوانٍ</span>
            </h2>
            <p className="mt-4 text-lg leading-8 text-[var(--mute)]">اختر نشاطك واكتب اسم محلك، وشاهد كيف سيبدو متجرك على هاتف الزبون.</p>
          </div>
          <div data-reveal>
            <StoreBuilder />
          </div>
        </div>
      </section>

      {/* 4. How it works */}
      <section id="how" className="nama-wrap py-20">
        <div className="mb-12" data-reveal>
          <div className="kun-kicker">طريقة العمل</div>
          <h2 className="nama-display text-3xl sm:text-[2.6rem]">
            <span className="hl hl-apricot">من المحل إلى الهاتف في ثلاث خطوات</span>
          </h2>
        </div>
        <ol className="kun-steps grid gap-10 md:grid-cols-3" data-reveal>
          <span className="kun-steps-line" aria-hidden />
          {steps.map((s, i) => (
            <li key={s.title} className="relative" data-reveal style={{ "--d": `${0.15 + i * 0.2}s` } as React.CSSProperties}>
              <span className="nama-step mb-5" aria-hidden>
                {i + 1}
              </span>
              <h3 className="mb-2 text-xl font-semibold">{s.title}</h3>
              <p className="mb-3 leading-8 text-[var(--mute)]">{s.text}</p>
              <span className="kun-time">⏱ {s.time}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* 5. Built for local selling */}
      <section className="nama-band py-20">
        <div className="nama-wrap">
          <div className="mb-12 max-w-3xl" data-reveal>
            <div className="kun-kicker">مصمَّم لطريقة البيع المحلية</div>
            <h2 className="nama-display text-3xl sm:text-[2.6rem]">
              <span className="hl hl-pist">كل ما يحتاجه المحل في سوريا، دون تعقيد</span>
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {local.map((f, i) => (
              <div key={f.title} className="kun-feature" data-reveal style={{ "--d": `${(i % 3) * 0.1}s` } as React.CSSProperties}>
                <span className="kun-ico">
                  <Icon name={f.icon} />
                </span>
                <h3 className="mb-1.5 text-lg font-semibold">{f.title}</h3>
                <p className="leading-8 text-[var(--mute)]">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. The service: we build it and bring the customers */}
      <section className="nama-dark relative overflow-hidden py-20">
        <div className="kun-orbit" aria-hidden />
        <div className="nama-wrap relative grid gap-12 lg:grid-cols-2">
          <div data-reveal>
            <div className="kun-kicker !text-[var(--pist)]">لا وقت لديك؟</div>
            <h2 className="nama-display mb-4 text-3xl leading-[1.6] text-white sm:text-[2.6rem]">
              <span className="hl hl-dark">نجهّز متجرك، ونساعدك في الوصول إلى الزبائن.</span>
            </h2>
            <p className="mb-8 text-lg leading-9 text-white/75">يضيف فريقنا منتجاتك، ويصمم الصور والمنشورات، ويدير إعلانات فيسبوك وإنستغرام التي توجّه الزبائن إلى متجرك، بينما تتفرغ أنت لعملك.</p>
            <a href={helpLink} target={SUPPORT ? "_blank" : undefined} rel="noopener noreferrer" className="nama-btn-pist text-lg">
              تواصل معنا عبر واتساب
            </a>
          </div>
          <ul className="kun-chain self-center">
            {[
              ["تجهيز المتجر", "نضيف منتجاتك بصورها وأسعارها، وننسّق المتجر بما يتوافق مع هوية محلك.", "🏪"],
              ["المحتوى والصور", "منشورات ومقاطع قصيرة، وصور منتجات احترافية بالذكاء الاصطناعي.", "📸"],
              ["إدارة الإعلانات", "حملات على فيسبوك وإنستغرام مرتبطة بمتجرك، مع تقرير شهري بعدد الطلبات.", "📈"],
            ].map(([t, d, e], i) => (
              <li key={t} className="kun-link" data-reveal style={{ "--d": `${i * 0.18}s` } as React.CSSProperties}>
                <span className="kun-link-ico" aria-hidden>
                  {e}
                </span>
                <div>
                  <div className="mb-1 font-semibold text-[var(--pist)]">{t}</div>
                  <div className="leading-7 text-white/75">{d}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 7. Pricing */}
      <section id="pricing" className="nama-wrap py-20">
        <div className="mb-10" data-reveal>
          <div className="kun-kicker">الأسعار</div>
          <h2 className="nama-display text-3xl sm:text-[2.6rem]">
            <span className="hl hl-apricot">أسعار واضحة، دون عمولة</span>
          </h2>
          <p className="mt-3 text-lg text-[var(--mute)]">جرّب جميع الميزات لمدة 14 يوماً، ثم اختر الباقة المناسبة.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <Plan
            name="أساسي"
            price="15$"
            note="كل ما يحتاجه المحل للبيع عبر الإنترنت"
            items={["متجر جاهز بقالب يناسب نشاطك", "حتى 100 منتج", "الاستلام من المحل والتوصيل", "استلام الطلبات عبر واتساب", "رموز خصم وتقارير"]}
          />
          <Plan
            name="احترافي"
            price="29$"
            note="للمحلات المتنامية"
            featured
            items={["جميع ميزات الباقة الأساسية، ومنتجات غير محدودة", "حسابات للموظفين بصلاحيات محددة", "حتى 5 فروع، لكل فرع رقم واتساب خاص", "فواتير وعروض أسعار PDF للزبائن", "ربط إعلانات فيسبوك وإنستغرام"]}
          />
        </div>
        <p className="kun-founder mt-6" data-reveal>
          <span className="kun-founder-tag">سعر المؤسسين</span>
          تحصل أول 50 محلاً في كل مدينة على الباقة الأساسية بسعر 10$ شهرياً بشكل دائم. وعند الدفع المسبق لستة أشهر، تحصل على شهر مجاني.
        </p>
      </section>

      {/* 8. Demo stores */}
      <section className="nama-band py-20">
        <div className="nama-wrap">
          <div className="mb-8" data-reveal>
            <div className="kun-kicker">متاجر حقيقية على المنصة</div>
            <h2 className="nama-display text-3xl sm:text-[2.6rem]">
              <span className="hl hl-mint">افتح متجراً وجرّب تقديم طلب</span>
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {demoStores.map((s, i) => (
              <Link key={s.slug} href={storeUrl(s.slug)} className="kun-demo group" data-reveal style={{ "--d": `${i * 0.12}s` } as React.CSSProperties}>
                <div className="overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={(s.sections.find((x) => x.type === "hero") as { image?: string } | undefined)?.image} alt="" className="aspect-[2/1] w-full object-cover transition duration-500 group-hover:scale-105" />
                </div>
                <div className="flex items-center justify-between p-5">
                  <div>
                    <div className="text-xl font-semibold">{s.name}</div>
                    <div className="text-sm text-[var(--mute)]">{s.tagline}</div>
                  </div>
                  <span className="kun-arrow" aria-hidden>
                    ←
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 9. FAQ */}
      <section className="nama-wrap max-w-3xl py-20">
        <h2 className="nama-display mb-8 text-3xl sm:text-[2.6rem]" data-reveal>
          <span className="hl hl-pist">الأسئلة الشائعة</span>
        </h2>
        <div className="divide-y divide-black/10 border-y border-black/10">
          {faqs.map((f) => (
            <details key={f.q} className="kun-faq group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold">
                {f.q}
                <span className="kun-plus" aria-hidden>
                  +
                </span>
              </summary>
              <p className="mt-3 leading-8 text-[var(--mute)]">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* 10. Final call */}
      <section id="final-cta" className="nama-wrap pb-24">
        <div className="kun-final" data-reveal>
          <h2 className="brand-display mb-4 text-4xl leading-[1.5] sm:text-6xl">
            <span className="hl hl-apricot">كُن حيث يبحث زبائنك.</span>
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-lg leading-8 text-[var(--mute)]">كل متجر جميل بدأ بمنتج واحد. أضف منتجك الأول اليوم، وشارك الرابط مع زبائنك.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/signup" className="nama-btn kun-shine text-lg">
              ابدأ مجاناً لمدة 14 يوماً
            </Link>
            <a href={helpLink} target={SUPPORT ? "_blank" : undefined} rel="noopener noreferrer" className="nama-btn-ghost text-lg">
              اطلب تجهيز متجرك
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-black/10 py-8 pb-28 md:pb-8">
        <div className="nama-wrap flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--mute)]">
          <span>
            © {new Date().getFullYear()} {BRAND_FULL_AR} · {BRAND_FULL}
          </span>
          <span className="flex gap-4">
            <Link href="/login" className="hover:underline">
              دخول التجار
            </Link>
            {SUPPORT && (
              <a href={helpLink} target="_blank" rel="noopener noreferrer" className="hover:underline">
                تواصل معنا
              </a>
            )}
          </span>
        </div>
      </footer>

      <StickyCta />
    </div>
  );
}

function Plan({ name, price, note, items, featured }: { name: string; price: string; note: string; items: string[]; featured?: boolean }) {
  return (
    <div className={`kun-plan rounded-3xl p-7 ${featured ? "kun-plan-pro bg-[var(--ink)] text-white" : "bg-[var(--card)] ring-1 ring-black/10"}`} data-reveal>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-lg font-semibold">{name}</span>
        {featured && <span className="rounded-full bg-[var(--pist)] px-3 py-1 text-xs font-semibold text-[#16241A]">يشمل الفروع والموظفين</span>}
      </div>
      <div className={`mb-4 text-sm ${featured ? "text-white/70" : "text-[var(--mute)]"}`}>{note}</div>
      <div className="mb-6 flex items-baseline gap-2">
        <span className={`brand-display hl text-5xl ${featured ? "hl-dark" : "hl-pist"}`} dir="ltr">
          {price}
        </span>
        <span className={featured ? "text-white/70" : "text-[var(--mute)]"}>شهرياً</span>
      </div>
      <ul className="mb-8 space-y-2.5">
        {items.map((i) => (
          <li key={i} className="flex gap-2 leading-7">
            <span className={featured ? "text-[var(--pist)]" : "text-[var(--leaf)]"} aria-hidden>
              ✓
            </span>
            {i}
          </li>
        ))}
      </ul>
      <Link href="/signup" className={featured ? "nama-btn-pist w-full text-center" : "nama-btn w-full text-center"}>
        جرّب مجاناً لمدة 14 يوماً
      </Link>
    </div>
  );
}

type IconName = "store" | "cash" | "coins" | "signal" | "percent" | "bell";
function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    store: (
      <>
        <path d="M4 9.5 5.5 4h13L20 9.5" />
        <path d="M4 9.5c0 1.4 1.1 2.5 2.7 2.5s2.6-1.1 2.6-2.5c0 1.4 1.1 2.5 2.7 2.5s2.7-1.1 2.7-2.5c0 1.4 1 2.5 2.6 2.5S20 10.9 20 9.5" />
        <path d="M5.5 12v8h13v-8M10 20v-4.5h4V20" />
      </>
    ),
    cash: (
      <>
        <rect x="3" y="6" width="18" height="12" rx="2.5" />
        <circle cx="12" cy="12" r="2.6" />
        <path d="M6.5 9.5v5M17.5 9.5v5" />
      </>
    ),
    coins: (
      <>
        <ellipse cx="9" cy="7" rx="5" ry="2.5" />
        <path d="M4 7v4c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5V7" />
        <path d="M10 15.5c.9 1.2 3 2 5.5 2 2.8 0 4.5-1.1 4.5-2.5v-4c0-1.4-1.7-2.5-4.5-2.5" />
      </>
    ),
    signal: (
      <>
        <path d="M5 19v-3M10 19v-6M15 19V9M20 19V5" />
      </>
    ),
    percent: (
      <>
        <path d="M19 5 5 19" />
        <circle cx="7" cy="7" r="2.4" />
        <circle cx="17" cy="17" r="2.4" />
      </>
    ),
    bell: (
      <>
        <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" />
        <path d="M10 20.5a2.2 2.2 0 0 0 4 0" />
      </>
    ),
  };
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}

const CSS = `
.nama{--bg:#F5F8EF;--ink:#16241A;--leaf:#2D6A38;--pist:#C3D97F;--pist-soft:#E6EFC6;--mute:#56644F;--card:#fff;background:var(--bg);color:var(--ink);font-family:"IBM Plex Sans Arabic",system-ui,sans-serif;overflow-x:clip}
.nama-wrap{max-width:72rem;margin-inline:auto;padding-inline:1.25rem}
.nama-display{font-family:"Fraunces","Rakkas",system-ui,sans-serif;font-style:italic;font-weight:900;font-synthesis:none;line-height:1.55}
.nama-band{background:#EAF0DE}
.nama-dark{background:var(--ink)}
.nama-btn,.nama-btn-ghost,.nama-btn-pist{display:inline-block;border-radius:999px;padding:.85rem 1.6rem;font-weight:600;transition:transform .15s ease,box-shadow .2s ease}
.nama-btn{background:var(--leaf);color:#fff;box-shadow:0 10px 24px -14px rgba(45,106,56,.9)}
.nama-btn-ghost{box-shadow:inset 0 0 0 2px var(--ink);color:var(--ink)}
.nama-btn-pist{background:var(--pist);color:var(--ink)}
.nama-btn:hover,.nama-btn-ghost:hover,.nama-btn-pist:hover{transform:translateY(-2px)}
.nama a:focus-visible,.nama summary:focus-visible,.nama button:focus-visible,.nama input:focus-visible{outline:3px solid var(--leaf);outline-offset:3px;border-radius:10px}
.nama-step{flex:none;display:grid;place-items:center;width:3.25rem;height:3.25rem;border-radius:999px;background:var(--pist-soft);color:var(--ink);font-family:"Fraunces",serif;font-style:italic;font-weight:900;font-size:1.5rem;position:relative;z-index:1;box-shadow:0 0 0 6px var(--bg)}
.nama-phone{border-radius:2.4rem;border:10px solid var(--ink);overflow:hidden;background:#fff;box-shadow:0 30px 60px -25px rgba(22,36,26,.45)}
.nama-chat{background:#ECE5DD;font-size:12.5px;line-height:1.7}

/* Header */
.kun-head{position:sticky;top:0;z-index:40;background:color-mix(in srgb,var(--bg) 82%,transparent);backdrop-filter:saturate(1.4) blur(12px);-webkit-backdrop-filter:saturate(1.4) blur(12px);border-bottom:1px solid color-mix(in srgb,var(--ink) 7%,transparent)}

/* Hero */
.kun-hero{position:relative;overflow:hidden}
.kun-grain{position:absolute;inset:0;pointer-events:none;background:radial-gradient(40rem 26rem at 15% 20%,color-mix(in srgb,var(--pist) 45%,transparent),transparent 70%),radial-gradient(30rem 22rem at 90% 90%,rgba(255,211,168,.35),transparent 70%)}
.kun-eyebrow{display:inline-flex;align-items:center;gap:.5rem;font-size:.85rem;font-weight:600;padding:.4rem .9rem;border-radius:999px;background:var(--card);box-shadow:0 0 0 1px color-mix(in srgb,var(--ink) 10%,transparent)}
.kun-dot{width:.5rem;height:.5rem;border-radius:999px;background:#25D366;box-shadow:0 0 0 0 rgba(37,211,102,.6);animation:kun-ping 2s infinite}
.kun-check{display:grid;place-items:center;width:1.15rem;height:1.15rem;border-radius:999px;background:var(--pist-soft);color:var(--leaf);font-size:.7rem;font-weight:700}
.hl-draw{background-size:0% .42em;background-position:right 86%;animation:kun-draw .9s var(--dl,.25s) cubic-bezier(.6,.1,.2,1) forwards}
.kun-rise{opacity:0;transform:translateY(14px);animation:kun-rise .7s calc(.5s + var(--d,0s)) cubic-bezier(.2,.8,.2,1) forwards}
.kun-shine{position:relative;overflow:hidden}
.kun-shine::after{content:"";position:absolute;inset:0;background:linear-gradient(100deg,transparent 30%,rgba(255,255,255,.35) 50%,transparent 70%);transform:translateX(120%);animation:kun-shine 4.5s 2s infinite}

/* Story phone */
.kun-story{position:relative;margin-inline:auto;width:100%;max-width:330px}
.kun-glow{position:absolute;inset:8% -14%;border-radius:50%;background:radial-gradient(closest-side,color-mix(in srgb,var(--pist) 80%,transparent),transparent);filter:blur(24px);z-index:0}
.kun-phone{position:relative;z-index:1;height:560px;animation:kun-float 7s ease-in-out infinite}
.kun-notch{position:absolute;top:7px;left:50%;transform:translateX(-50%);width:84px;height:18px;border-radius:999px;background:#16241A;z-index:6}
.kun-scene{position:absolute;inset:0;background:#fff;opacity:0;animation:kun-scene 14s calc(var(--i) * 3.5s) infinite both}
.kun-ig-ring{flex:none;width:4.2rem;height:4.2rem;border-radius:999px;padding:3px;background:conic-gradient(from 200deg,#feda75,#fa7e1e,#d62976,#962fbf,#feda75)}
.kun-ig-ring>span{box-shadow:0 0 0 3px #fff}
.kun-ig-link{margin-top:.35rem;font-weight:600;color:#00376b;font-size:12px}
.kun-tap{position:absolute;width:30px;height:30px;margin:-15px;border-radius:50%;background:rgba(22,36,26,.28);box-shadow:0 0 0 2px rgba(255,255,255,.9);opacity:0;pointer-events:none;animation:kun-tap 14s calc(var(--i) * 3.5s) infinite both}
.kun-badge{position:absolute;top:-5px;left:-9px;display:grid;place-items:center;min-width:16px;height:16px;padding:0 4px;border-radius:99px;background:#e0245e;color:#fff;font-size:10px;font-weight:700;animation:kun-badge 14s calc(var(--i) * 3.5s) infinite both}
.kun-add{animation:kun-press 14s calc(var(--i) * 3.5s) infinite both}
.kun-bubble{align-self:flex-start;max-width:92%;background:#DCF8C6;border-radius:12px 12px 12px 2px;padding:.6rem .75rem;color:#111;animation:kun-bubble 14s calc(var(--i) * 3.5s) infinite both}
.kun-float{position:absolute;z-index:2;font-weight:600;font-size:.85rem;padding:.5rem .95rem;border-radius:999px;box-shadow:0 14px 30px -14px rgba(22,36,26,.55);white-space:nowrap;animation:kun-pop 14s infinite both}
.kun-float-a{top:5.5rem;left:-1.5rem;background:var(--pist);color:#16241A;animation-delay:11s}
.kun-float-b{bottom:6rem;right:-1.5rem;background:var(--card);color:var(--ink);animation-delay:11.6s;font-family:"IBM Plex Sans Arabic",sans-serif}
.kun-caps{display:grid;gap:.5rem;grid-template-columns:repeat(2,minmax(0,1fr))}
@media (min-width:900px){.kun-caps{grid-template-columns:repeat(4,minmax(0,1fr))}}
.kun-cap{position:relative;display:flex;gap:.75rem;padding:1rem;border-radius:1.25rem;overflow:hidden;animation:kun-cap 14s calc(var(--i) * 3.5s) infinite both}
.kun-cap-n{flex:none;display:grid;place-items:center;width:1.9rem;height:1.9rem;border-radius:999px;background:var(--pist-soft);font-weight:700;font-size:.9rem}
.kun-cap-bar{position:absolute;bottom:0;right:0;left:0;height:3px;background:var(--leaf);transform:scaleX(0);transform-origin:right;animation:kun-bar 14s calc(var(--i) * 3.5s) infinite both}
@media (max-width:640px){.kun-cap{padding:.75rem}.kun-cap .text-sm{display:none}}

/* Marquee */
.kun-marquee{overflow:hidden;-webkit-mask-image:linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent);mask-image:linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)}
.kun-track{display:flex;width:max-content;animation:kun-marq 45s linear infinite}
.kun-tick{display:inline-flex;align-items:center;gap:1.6rem;padding-inline-end:1.6rem;font-family:"Rakkas",serif;font-size:1.6rem;white-space:nowrap}
.kun-star{color:var(--leaf);font-size:1rem}

/* Section labels */
.kun-kicker{font-size:.85rem;font-weight:700;color:var(--leaf);margin-bottom:.6rem;letter-spacing:.01em}

/* Scroll reveal (only hides when JS runs) */
.kun-js .nama [data-reveal]{opacity:0;transform:translateY(22px);transition:opacity .75s ease,transform .75s cubic-bezier(.2,.8,.2,1);transition-delay:var(--d,0s)}
.kun-js .nama [data-reveal].is-in{opacity:1;transform:none}

/* Calculator */
.kun-chaos{border-radius:1.75rem;overflow:hidden;background:#ECE5DD;box-shadow:0 30px 60px -30px rgba(22,36,26,.45);max-width:26rem;margin-inline:auto;width:100%}
.kun-chaos-head{display:flex;align-items:center;gap:.6rem;background:#075E54;color:#fff;padding:.8rem 1rem}
.kun-q{position:relative;width:fit-content;max-width:85%;background:#fff;color:#111;border-radius:12px 12px 2px 12px;padding:.5rem .8rem 1.1rem;font-size:.9rem;box-shadow:0 1px 0 rgba(0,0,0,.06)}
.kun-q:nth-child(even){margin-inline-start:1.5rem}
.kun-q-time{position:absolute;bottom:.2rem;left:.6rem;font-size:.65rem;color:rgba(0,0,0,.4)}
.kun-js .kun-chaos .kun-q{opacity:0;transform:translateY(10px) scale(.96)}
.kun-chaos.is-in .kun-q{animation:kun-rise .45s var(--d) cubic-bezier(.2,.8,.2,1) forwards}
.kun-range{-webkit-appearance:none;appearance:none;height:.55rem;border-radius:999px;background:linear-gradient(to left,var(--leaf) var(--p),color-mix(in srgb,var(--ink) 12%,transparent) var(--p));cursor:pointer}
.kun-range::-webkit-slider-thumb{-webkit-appearance:none;width:1.6rem;height:1.6rem;border-radius:999px;background:#fff;border:4px solid var(--leaf);box-shadow:0 4px 12px -4px rgba(22,36,26,.5)}
.kun-range::-moz-range-thumb{width:1.3rem;height:1.3rem;border-radius:999px;background:#fff;border:4px solid var(--leaf)}

/* Store builder */
.kun-chip{display:inline-flex;align-items:center;gap:.4rem;padding:.6rem 1rem;border-radius:999px;background:var(--card);box-shadow:inset 0 0 0 1.5px color-mix(in srgb,var(--ink) 14%,transparent);font-weight:600;transition:all .2s ease}
.kun-chip:hover{transform:translateY(-1px)}
.kun-chip.is-on{background:var(--ink);color:#fff;box-shadow:none}
.kun-input{width:100%;max-width:26rem;border-radius:1rem;padding:.9rem 1.1rem;font-size:1.1rem;background:var(--card);border:1.5px solid color-mix(in srgb,var(--ink) 14%,transparent);color:inherit}
.kun-input:focus{border-color:var(--leaf);outline:none}
.kun-swatch{width:2.4rem;height:2.4rem;border-radius:999px;box-shadow:0 0 0 3px var(--bg),0 0 0 4px transparent;transition:transform .2s ease,box-shadow .2s ease}
.kun-swatch.is-on{transform:scale(1.12);box-shadow:0 0 0 3px var(--bg),0 0 0 5.5px var(--ink)}
.kun-preview{transform:rotate(-2deg);transition:transform .4s ease}
.kun-preview:hover{transform:rotate(0)}
.kun-swap{animation:kun-rise .45s cubic-bezier(.2,.8,.2,1)}

/* Steps */
.kun-steps{position:relative}
.kun-steps-line{display:none}
@media (min-width:768px){.kun-steps-line{display:block;position:absolute;top:1.6rem;right:1.6rem;left:calc(33% - 1rem);height:2px;background:var(--leaf);transform:scaleX(0);transform-origin:right;transition:transform 1.4s .3s cubic-bezier(.6,.1,.2,1)}.kun-steps.is-in .kun-steps-line{transform:scaleX(1)}}
.kun-js .kun-steps[data-reveal]{opacity:1;transform:none}
.kun-time{display:inline-block;font-size:.8rem;font-weight:600;padding:.25rem .7rem;border-radius:999px;background:var(--pist-soft)}

/* Features */
.kun-feature{background:var(--card);border-radius:1.5rem;padding:1.6rem;box-shadow:0 0 0 1px color-mix(in srgb,var(--ink) 7%,transparent);transition:transform .3s ease,box-shadow .3s ease}
.kun-feature:hover{transform:translateY(-4px);box-shadow:0 0 0 1px color-mix(in srgb,var(--ink) 7%,transparent),0 24px 40px -28px rgba(22,36,26,.5)}
.kun-ico{display:grid;place-items:center;width:3rem;height:3rem;border-radius:1rem;background:var(--pist-soft);color:var(--leaf);margin-bottom:1rem;transition:transform .3s ease}
.kun-feature:hover .kun-ico{transform:rotate(-8deg) scale(1.06)}

/* Dark service band */
.kun-orbit{position:absolute;width:44rem;height:44rem;left:-14rem;top:-12rem;border-radius:999px;background:radial-gradient(closest-side,rgba(195,217,127,.16),transparent);animation:kun-drift 14s ease-in-out infinite alternate}
.kun-chain{position:relative;display:grid;gap:1rem}
.kun-link{display:flex;gap:1rem;border-radius:1.25rem;background:rgba(255,255,255,.06);padding:1.25rem;box-shadow:inset 0 0 0 1px rgba(255,255,255,.07);transition:background .3s ease}
.kun-link:hover{background:rgba(255,255,255,.1)}
.kun-link-ico{flex:none;display:grid;place-items:center;width:2.8rem;height:2.8rem;border-radius:.9rem;background:rgba(195,217,127,.14);font-size:1.3rem}

/* Pricing */
.kun-plan{transition:transform .3s ease}
.kun-plan:hover{transform:translateY(-4px)}
.kun-plan-pro{box-shadow:0 30px 60px -30px rgba(22,36,26,.7)}
.kun-founder{display:flex;flex-wrap:wrap;align-items:center;gap:.75rem;border-radius:1.25rem;background:var(--pist-soft);padding:1rem 1.25rem;line-height:2}
.kun-founder-tag{font-weight:700;padding:.2rem .8rem;border-radius:999px;background:var(--ink);color:#fff;font-size:.85rem}

/* Demo stores */
.kun-demo{display:block;overflow:hidden;border-radius:1.5rem;background:var(--card);box-shadow:0 0 0 1px color-mix(in srgb,var(--ink) 7%,transparent);transition:transform .3s ease,box-shadow .3s ease}
.kun-demo:hover{transform:translateY(-4px);box-shadow:0 0 0 1px color-mix(in srgb,var(--ink) 7%,transparent),0 24px 40px -26px rgba(22,36,26,.5)}
.kun-arrow{display:grid;place-items:center;width:2.4rem;height:2.4rem;border-radius:999px;background:var(--pist-soft);transition:transform .3s ease}
.kun-demo:hover .kun-arrow{transform:translateX(-4px);background:var(--pist)}

/* FAQ */
.kun-plus{flex:none;display:grid;place-items:center;width:2rem;height:2rem;border-radius:999px;background:var(--pist-soft);color:var(--leaf);font-size:1.3rem;transition:transform .3s ease}
.kun-faq[open] .kun-plus{transform:rotate(45deg);background:var(--pist)}
.kun-faq[open] p{animation:kun-rise .35s ease}

/* Final */
.kun-final{text-align:center;border-radius:2rem;padding:3.5rem 1.25rem;background:radial-gradient(30rem 16rem at 50% 0%,color-mix(in srgb,var(--pist) 55%,transparent),transparent 70%),var(--card);box-shadow:0 0 0 1px color-mix(in srgb,var(--ink) 7%,transparent)}

/* Sticky phone CTA */
.kun-sticky{position:fixed;z-index:50;right:.75rem;left:.75rem;bottom:.75rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.6rem .6rem .6rem .6rem;padding-inline-start:1.1rem;border-radius:1.25rem;background:var(--card);box-shadow:0 0 0 1px color-mix(in srgb,var(--ink) 8%,transparent),0 18px 40px -16px rgba(22,36,26,.55);transform:translateY(160%);transition:transform .45s cubic-bezier(.2,.8,.2,1)}
.kun-sticky.is-on{transform:none}
@media (min-width:768px){.kun-sticky{display:none}}

/* Dark mode */
html[data-mode=dark] .nama{--bg:#0e1510;--mute:#a7b49f;--pist-soft:#26331f;--card:#17221a;color:#e8efe1}
html[data-mode=dark] .nama-band{background:#142019}
html[data-mode=dark] .nama-dark{background:#08100a;box-shadow:inset 0 1px 0 rgba(255,255,255,.06),inset 0 -1px 0 rgba(255,255,255,.06)}
html[data-mode=dark] .nama-btn-ghost{box-shadow:inset 0 0 0 2px #e8efe1;color:#e8efe1}
html[data-mode=dark] .nama-step,html[data-mode=dark] .kun-cap-n{color:#e8efe1}
html[data-mode=dark] .nama-phone{border-color:#2b3a2f;box-shadow:0 30px 60px -25px rgba(0,0,0,.7)}
html[data-mode=dark] .nama .kun-chip.is-on{background:var(--pist);color:#16241A}
html[data-mode=dark] .nama .kun-swatch.is-on{box-shadow:0 0 0 3px var(--bg),0 0 0 5.5px #e8efe1}
html[data-mode=dark] .nama .kun-plan-pro{background:#08100a;box-shadow:0 0 0 1px rgba(195,217,127,.35)}
html[data-mode=dark] .nama .kun-founder-tag{background:var(--pist);color:#16241A}
html[data-mode=dark] .nama .nama-btn-pist{color:#16241A}
html[data-mode=dark] .nama .border-black\\/10,html[data-mode=dark] .nama .divide-black\\/10>*{border-color:rgba(255,255,255,.1)}
html[data-mode=dark] .nama .ring-black\\/5{--tw-ring-color:rgba(0,0,0,.05)}
html[data-mode=dark] .nama .kun-chaos{box-shadow:0 30px 60px -30px rgba(0,0,0,.8)}
html[data-mode=dark] .nama .hl-butter{--hl:#6b5a1c}
html[data-mode=dark] .nama .hl-apricot{--hl:#6e4320}
html[data-mode=dark] .nama .hl-mint{--hl:#2f5a40}
html[data-mode=dark] .nama .hl-pist{--hl:#4a5a22}
html[data-mode=dark] [data-ui].nama .text-\\[\\#16241A\\]{color:#16241A}
html[data-mode=dark] [data-ui] :is(.kun-phone,.kun-preview,.kun-chaos){color-scheme:light;color:#111}
html[data-mode=dark] [data-ui] :is(.kun-phone,.kun-preview,.kun-chaos) .text-black{color:#000}
html[data-mode=dark] [data-ui] :is(.kun-phone,.kun-preview,.kun-chaos) .bg-white{background:#fff}
html[data-mode=dark] [data-ui] :is(.kun-phone,.kun-preview,.kun-chaos) .text-black\\/40{color:rgba(0,0,0,.4)}
html[data-mode=dark] [data-ui] :is(.kun-phone,.kun-preview,.kun-chaos) .ring-black\\/5{--tw-ring-color:rgba(0,0,0,.05)}
html[data-mode=dark] [data-ui] :is(.kun-phone,.kun-preview) .border-black\\/5{border-color:rgba(0,0,0,.05)}

/* Keyframes */
@keyframes kun-draw{to{background-size:100% .42em}}
@keyframes kun-rise{to{opacity:1;transform:none}}
@keyframes kun-ping{0%{box-shadow:0 0 0 0 rgba(37,211,102,.6)}80%,100%{box-shadow:0 0 0 9px rgba(37,211,102,0)}}
@keyframes kun-shine{0%{transform:translateX(120%)}25%,100%{transform:translateX(-120%)}}
@keyframes kun-float{50%{transform:translateY(-8px)}}
@keyframes kun-scene{0%{opacity:0;transform:translateX(-22px)}3%{opacity:1;transform:none}23%{opacity:1;transform:none}25.5%{opacity:0;transform:translateX(22px)}100%{opacity:0;transform:translateX(22px)}}
@keyframes kun-tap{0%,10%{opacity:0;transform:scale(.4)}12%{opacity:1;transform:scale(1)}16%{opacity:0;transform:scale(2.4)}100%{opacity:0}}
@keyframes kun-press{0%,11.5%{transform:none}12.5%{transform:scale(.92)}14%,100%{transform:none}}
@keyframes kun-badge{0%,13%{transform:scale(0)}15.5%{transform:scale(1.4)}17.5%,100%{transform:scale(1)}}
@keyframes kun-bubble{0%,5%{opacity:0;transform:translateY(16px)}9%,100%{opacity:1;transform:none}}
@keyframes kun-pop{0%{opacity:0;transform:translateY(10px) scale(.9)}4%{opacity:1;transform:none}17%{opacity:1;transform:none}20%,100%{opacity:0;transform:translateY(-6px)}}
@keyframes kun-cap{0%{opacity:.45;background:transparent}2%,23%{opacity:1;background:var(--card)}25.5%,100%{opacity:.45;background:transparent}}
@keyframes kun-bar{0%{transform:scaleX(0);opacity:1}24%{transform:scaleX(1);opacity:1}25.5%,100%{transform:scaleX(1);opacity:0}}
@keyframes kun-marq{to{transform:translateX(50%)}}
@keyframes kun-drift{to{transform:translate(10rem,6rem)}}

@media (prefers-reduced-motion:reduce){
  .nama *,.nama *::before,.nama *::after{animation:none!important;transition:none!important}
  .hl-draw{background-size:100% .42em}
  .kun-rise,.kun-js .nama [data-reveal],.kun-js .kun-chaos .kun-q{opacity:1!important;transform:none!important}
  .kun-scene{opacity:0}.kun-scene:last-of-type{opacity:1}.kun-bubble{opacity:1}
  .kun-cap{opacity:1}.kun-cap-bar,.kun-tap,.kun-float-b{display:none}.kun-float-a{opacity:1}
  .kun-badge{transform:none}
}
`;
