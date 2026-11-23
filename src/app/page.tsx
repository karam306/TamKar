import Link from "next/link";
import { BRAND, BRAND_AR } from "@/lib/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { demoStores } from "@/lib/demo-data";

/**
 * Kun's public homepage. Audience: shop owners in Syria, mostly on phones.
 * One job: get them to open a store (or ask us to build it for them).
 * Look: olive and pistachio, Rakkas / Fraunces Black Italic headlines with a pastel
 * highlighter bar under them (the brand mark), and one moving moment,
 * the WhatsApp order arriving on the phone.
 */

const SUPPORT = process.env.PLATFORM_SUPPORT_WHATSAPP;
const helpLink = SUPPORT ? `https://wa.me/${SUPPORT}?text=${encodeURIComponent("مرحباً، أرغب في مساعدتكم لإنشاء متجر على منصة كُن")}` : "/signup";

const steps = [
  { title: "أنشئ متجرك", text: "أجب عن بضعة أسئلة: اسم المحل، ونوع نشاطك، ورقم واتساب. يُجهَّز متجرك بقالب يناسب نشاطك." },
  { title: "شارك الرابط", text: "ضعه في التعريف على إنستغرام، أو انشره في القصص ومجموعات واتساب. يطّلع الزبون على منتجاتك وأسعارها." },
  { title: "استلم الطلب", text: "يصلك الطلب منظّماً عبر واتساب. يستلمه الزبون من محلك ويدفع، أو توصله إليه إن كانت لديك خدمة توصيل." },
];

const syria = [
  { title: "الاستلام من المحل هو الأساس", text: "لا تملك خدمة توصيل؟ لا بأس. يطلب الزبون عبر الإنترنت ويستلم طلبه جاهزاً من المحل." },
  { title: "الدفع عند الاستلام", text: "لا حاجة إلى بطاقات أو دفع إلكتروني. يدفع الزبون عند الاستلام، أو بالتحويل عبر شام كاش." },
  { title: "بالليرة أو بالدولار", text: "سعّر منتجاتك بالعملة التي تتعامل بها." },
  { title: "سريع على الاتصال الضعيف", text: "صُمّم المتجر ليفتح بسرعة على الهاتف المحمول، حتى مع اتصال ضعيف." },
  { title: "دون عمولة على مبيعاتك", text: "اشتراك شهري ثابت، وجميع أرباح مبيعاتك لك." },
  { title: "لوحة تحكم عربية وبسيطة", text: "واجهة واضحة تتيح لك إدارة متجرك دون خبرة تقنية." },
];

const faqs = [
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

      <header className="nama-wrap flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2" aria-label={`${BRAND_AR} ${BRAND}`}>
          <Sprout />
          <span className="brand-display text-[1.7rem] leading-none">{BRAND_AR}</span>
          <span className="brand-display hl hl-apricot text-lg leading-none" dir="ltr">
            {BRAND}
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <a href="#how" className="hidden px-3 py-2 hover:underline sm:inline">
            طريقة العمل
          </a>
          <a href="#pricing" className="hidden px-3 py-2 hover:underline sm:inline">
            الأسعار
          </a>
          <ThemeToggle compact />
          <Link href="/login" className="px-3 py-2 hover:underline">
            دخول
          </Link>
          <Link href="/signup" className="nama-btn !px-4 !py-2 text-sm">
            أنشئ متجرك
          </Link>
        </nav>
      </header>

      {/* Hero: the promise on one side, the moment it comes true on the other. */}
      <section className="nama-wrap grid items-center gap-10 pb-16 pt-8 lg:grid-cols-[1.15fr_1fr] lg:pt-16">
        <div>
          <h1 className="brand-display mb-6 text-[clamp(2.5rem,6.4vw,4.2rem)] leading-[1.45]">
            <span className="hl hl-apricot">متجرك على الإنترنت،</span>
            <br />
            <span className="hl hl-pist">وطلباتك تصلك عبر واتساب.</span>
          </h1>
          <p className="mb-8 max-w-xl text-lg leading-9 text-[var(--mute)]">
            تتيح لك منصة {BRAND_AR} إنشاء متجر إلكتروني عربي لمحلك خلال دقائق. يتصفح الزبون منتجاتك ويطلب من هاتفه، ويصلك الطلب منظّماً، ثم يستلمه من محلك ويدفع.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/signup" className="nama-btn text-lg">
              ابدأ تجربة مجانية لمدة 14 يوماً
            </Link>
            <a href={helpLink} target={SUPPORT ? "_blank" : undefined} rel="noopener noreferrer" className="nama-btn-ghost text-lg">
              اطلب تجهيز متجرك
            </a>
          </div>
          <p className="mt-4 text-sm text-[var(--mute)]">دون بطاقة ائتمان، ودون عمولة على مبيعاتك.</p>
        </div>

        <Phone />
      </section>

      <section id="how" className="nama-band py-16">
        <div className="nama-wrap">
          <h2 className="nama-display mb-10 text-3xl sm:text-[2.6rem]"><span className="hl hl-mint">من المحل إلى الهاتف في ثلاث خطوات</span></h2>
          <ol className="grid gap-8 md:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.title} className="flex gap-4">
                <span className="nama-step" aria-hidden>
                  {i + 1}
                </span>
                <div>
                  <h3 className="mb-2 text-xl font-semibold">{s.title}</h3>
                  <p className="leading-8 text-[var(--mute)]">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="nama-wrap py-16">
        <h2 className="nama-display mb-3 text-3xl sm:text-[2.6rem]"><span className="hl hl-pist">مصمَّم لطريقة البيع المحلية</span></h2>
        <p className="mb-10 max-w-2xl text-lg leading-8 text-[var(--mute)]">صُمّمت المنصة لتناسب المحلات في سوريا، مع التركيز على ما يحتاجه التاجر فعلاً.</p>
        <dl className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {syria.map((f) => (
            <div key={f.title} className="border-t-2 border-[var(--leaf)] pt-4">
              <dt className="mb-1 text-lg font-semibold">{f.title}</dt>
              <dd className="leading-8 text-[var(--mute)]">{f.text}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* The service: we build it and bring the customers. */}
      <section className="nama-dark py-16">
        <div className="nama-wrap grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="nama-display mb-4 text-3xl leading-[1.6] text-white sm:text-[2.6rem]"><span className="hl hl-dark">نجهّز متجرك، ونساعدك في الوصول إلى الزبائن.</span></h2>
            <p className="mb-8 text-lg leading-9 text-white/75">يضيف فريقنا منتجاتك، ويصمم الصور والمنشورات، ويدير إعلانات فيسبوك وإنستغرام التي توجّه الزبائن إلى متجرك، بينما تتفرغ أنت لعملك.</p>
            <a href={helpLink} target={SUPPORT ? "_blank" : undefined} rel="noopener noreferrer" className="nama-btn-pist text-lg">
              تواصل معنا عبر واتساب
            </a>
          </div>
          <ul className="space-y-4 self-center">
            {[
              ["تجهيز المتجر", "نضيف منتجاتك بصورها وأسعارها، وننسّق المتجر بما يتوافق مع هوية محلك."],
              ["المحتوى والصور", "منشورات ومقاطع قصيرة، وصور منتجات احترافية بالذكاء الاصطناعي."],
              ["إدارة الإعلانات", "حملات على فيسبوك وإنستغرام مرتبطة بمتجرك، مع تقرير شهري بعدد الطلبات."],
            ].map(([t, d]) => (
              <li key={t} className="rounded-2xl bg-white/[0.06] p-5">
                <div className="mb-1 font-semibold text-[var(--pist)]">{t}</div>
                <div className="leading-7 text-white/75">{d}</div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="pricing" className="nama-wrap py-16">
        <h2 className="nama-display mb-3 text-3xl sm:text-[2.6rem]"><span className="hl hl-apricot">أسعار واضحة، دون عمولة</span></h2>
        <p className="mb-10 text-lg text-[var(--mute)]">جرّب جميع الميزات لمدة 14 يوماً، ثم اختر الباقة المناسبة.</p>
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
        <p className="mt-6 rounded-2xl bg-[var(--pist-soft)] p-4 leading-8">
          <b>سعر المؤسسين:</b> تحصل أول 50 محلاً في كل مدينة على الباقة الأساسية بسعر 10$ شهرياً بشكل دائم. وعند الدفع المسبق لستة أشهر، تحصل على شهر مجاني.
        </p>
      </section>

      <section className="nama-band py-16">
        <div className="nama-wrap">
          <h2 className="nama-display mb-3 text-3xl sm:text-[2.6rem]"><span className="hl hl-mint">جرّب بنفسك</span></h2>
          <p className="mb-8 text-lg text-[var(--mute)]">متاجر تجريبية على المنصة. افتح أياً منها وجرّب تقديم طلب.</p>
          <div className="grid gap-4 sm:grid-cols-3">
            {demoStores.map((s) => (
              <Link key={s.slug} href={`/s/${s.slug}`} className="group block overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={(s.sections.find((x) => x.type === "hero") as { image?: string } | undefined)?.image} alt="" className="aspect-[2/1] w-full object-cover" />
                <div className="p-5">
                  <div className="text-xl font-semibold group-hover:underline">{s.name}</div>
                  <div className="text-sm text-[var(--mute)]">{s.tagline}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="nama-wrap max-w-3xl py-16">
        <h2 className="nama-display mb-8 text-3xl sm:text-[2.6rem]"><span className="hl hl-pist">الأسئلة الشائعة</span></h2>
        <div className="divide-y divide-black/10 border-y border-black/10">
          {faqs.map((f) => (
            <details key={f.q} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between text-lg font-semibold">
                {f.q}
                <span className="text-2xl text-[var(--leaf)] transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 leading-8 text-[var(--mute)]">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="nama-wrap pb-20 text-center">
        <h2 className="brand-display mb-8 text-4xl leading-[1.5] sm:text-6xl"><span className="hl hl-apricot">دع تجارتك تنمو.</span></h2>
        <Link href="/signup" className="nama-btn text-lg">
          ابدأ مجاناً
        </Link>
      </section>

      <footer className="border-t border-black/10 py-8">
        <div className="nama-wrap flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--mute)]">
          <span>
            © {new Date().getFullYear()} {BRAND_AR} {BRAND}
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
    </div>
  );
}

function Plan({ name, price, note, items, featured }: { name: string; price: string; note: string; items: string[]; featured?: boolean }) {
  return (
    <div className={`rounded-3xl p-7 ${featured ? "bg-[var(--ink)] text-white" : "bg-white ring-1 ring-black/10"}`}>
      <div className="mb-1 text-lg font-semibold">{name}</div>
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

/** The real thing: a store on the phone, and the order message arriving. */
function Phone() {
  return (
    <div className="relative mx-auto w-full max-w-[340px]" aria-hidden>
      <div className="nama-phone">
        <div className="flex items-center gap-2 bg-[#075E54] px-4 py-3 text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm">🧁</span>
          <div className="text-sm leading-tight">
            <div className="font-semibold">زبون جديد</div>
            <div className="text-xs text-white/70">متصل الآن</div>
          </div>
        </div>
        <div className="nama-chat flex min-h-[420px] flex-col justify-end gap-2 p-3">
          <div className="nama-typing">
            <i />
            <i />
            <i />
          </div>
          <div className="nama-bubble">
            <div className="mb-1 font-semibold">طلب جديد رقم #1043 من متجر حلويات الياسمين</div>
            <div>• معمول تمر كيلو × 2 = 190,000 ل.س</div>
            <div>• بقلاوة مشكلة × 1 = 140,000 ل.س</div>
            <div className="mt-1">طريقة الاستلام: من المحل</div>
            <div className="font-semibold">المجموع: 330,000 ل.س</div>
            <div>الدفع: عند الاستلام</div>
            <div className="mt-1">الاسم: رنا الحسن</div>
            <div className="mt-1 text-left text-[10px] text-black/40">9:41 ✓✓</div>
          </div>
        </div>
      </div>
      <div className="nama-tag">🛍️ وصل طلب جديد</div>
    </div>
  );
}

function Sprout() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden>
      <path d="M16 29V15" stroke="var(--leaf)" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M16 17C16 10 11 6 4 6c0 7 5 11 12 11Z" fill="var(--leaf)" />
      <path d="M16 14c0-6 4.5-10 11-10 0 6-4.5 10-11 10Z" fill="var(--pist)" />
    </svg>
  );
}

const CSS = `
.nama{--bg:#F5F8EF;--ink:#16241A;--leaf:#2D6A38;--pist:#C3D97F;--pist-soft:#E6EFC6;--mute:#56644F;background:var(--bg);color:var(--ink);font-family:"IBM Plex Sans Arabic",system-ui,sans-serif}
.nama-wrap{max-width:72rem;margin-inline:auto;padding-inline:1.25rem}
.nama-display{font-family:"Fraunces","Rakkas",system-ui,sans-serif;font-style:italic;font-weight:900;font-synthesis:none;line-height:1.55}
.nama-band{background:#EAF0DE}
.nama-dark{background:var(--ink)}
.nama-btn,.nama-btn-ghost,.nama-btn-pist{display:inline-block;border-radius:999px;padding:.85rem 1.6rem;font-weight:600;transition:transform .15s ease}
.nama-btn{background:var(--leaf);color:#fff}
.nama-btn-ghost{box-shadow:inset 0 0 0 2px var(--ink);color:var(--ink)}
.nama-btn-pist{background:var(--pist);color:var(--ink)}
.nama-btn:hover,.nama-btn-ghost:hover,.nama-btn-pist:hover{transform:translateY(-1px)}
.nama a:focus-visible,.nama summary:focus-visible{outline:3px solid var(--leaf);outline-offset:3px;border-radius:8px}
.nama-step{flex:none;display:grid;place-items:center;width:3rem;height:3rem;border-radius:999px;background:var(--pist-soft);color:var(--ink);font-family:"Fraunces",serif;font-style:italic;font-weight:900;font-size:1.5rem}
.nama-phone{border-radius:2.4rem;border:10px solid var(--ink);overflow:hidden;background:#fff;box-shadow:0 30px 60px -25px rgba(22,36,26,.45)}
.nama-chat{background:#ECE5DD;font-size:12.5px;line-height:1.7}
.nama-bubble{align-self:flex-start;max-width:92%;background:#DCF8C6;border-radius:12px 12px 12px 2px;padding:.6rem .75rem;color:#111;opacity:0;transform:translateY(14px);animation:nama-in .5s 1.6s cubic-bezier(.2,.8,.2,1) forwards}
.nama-typing{align-self:flex-start;display:flex;gap:4px;background:#fff;border-radius:12px;padding:.6rem .75rem;animation:nama-out .2s 1.5s forwards}
.nama-typing i{width:6px;height:6px;border-radius:50%;background:#999;animation:nama-dot 1s infinite}
.nama-typing i:nth-child(2){animation-delay:.15s}.nama-typing i:nth-child(3){animation-delay:.3s}
.nama-tag{position:absolute;top:5.5rem;left:-1.25rem;background:var(--pist);color:var(--ink);font-weight:600;font-size:.85rem;padding:.45rem .9rem;border-radius:999px;box-shadow:0 10px 25px -12px rgba(22,36,26,.5);opacity:0;animation:nama-in .4s 2.1s forwards}
html[data-mode=dark] .nama{--bg:#0e1510;--mute:#a7b49f;--pist-soft:#26331f;color:#e8efe1}
html[data-mode=dark] .nama-band{background:#142019}
html[data-mode=dark] .nama-dark{background:#08100a;box-shadow:inset 0 1px 0 rgba(255,255,255,.06),inset 0 -1px 0 rgba(255,255,255,.06)}
html[data-mode=dark] .nama-btn-ghost{box-shadow:inset 0 0 0 2px #e8efe1;color:#e8efe1}
html[data-mode=dark] .nama-step{color:#e8efe1}
html[data-mode=dark] .nama-phone{border-color:#2b3a2f;box-shadow:0 30px 60px -25px rgba(0,0,0,.7)}
html[data-mode=dark] .nama .bg-white{background:#17221a}
html[data-mode=dark] .nama .bg-\\[var\\(--ink\\)\\]{background:#08100a;box-shadow:0 0 0 1px rgba(195,217,127,.35)}
html[data-mode=dark] .nama .nama-phone .bg-white,html[data-mode=dark] .nama .nama-typing{background:#fff}
html[data-mode=dark] .nama .text-black\\/40{color:rgba(0,0,0,.4)}
html[data-mode=dark] .nama .nama-tag{color:#16241A}
html[data-mode=dark] .nama .nama-btn-pist{color:#16241A}
@keyframes nama-in{to{opacity:1;transform:none}}
@keyframes nama-out{to{opacity:0;height:0;padding:0;margin:0}}
@keyframes nama-dot{50%{transform:translateY(-3px);opacity:.5}}
@media (prefers-reduced-motion:reduce){.nama-bubble,.nama-tag{animation:none;opacity:1;transform:none}.nama-typing{display:none}}
`;
