import Link from "next/link";
import { BRAND, BRAND_AR } from "@/lib/brand";
import { demoStores } from "@/lib/demo-data";

/**
 * Nama's public homepage. Audience: shop owners in Syria, mostly on phones.
 * One job: get them to open a store (or ask us to build it for them).
 * Look: olive and pistachio, Cairo Black headlines, and one moving moment,
 * the WhatsApp order arriving on the phone.
 */

const SUPPORT = process.env.PLATFORM_SUPPORT_WHATSAPP;
const helpLink = SUPPORT ? `https://wa.me/${SUPPORT}?text=${encodeURIComponent("مرحبا، بدي تساعدوني افتح متجر على نمى")}` : "/signup";

const steps = [
  { title: "افتح متجرك", text: "جاوب على كم سؤال: اسم المحل، شو بتبيع، رقم الواتساب. متجرك بيطلع جاهز بقالب مناسب لنشاطك." },
  { title: "شارك الرابط", text: "حطه بالبايو تبع انستغرام، ابعته بالستوري، أو بكروبات الواتساب. الزبون بيتفرج على كل منتجاتك بأسعارها." },
  { title: "استلم الطلب", text: "الطلب بيوصلك مرتب عالواتساب. الزبون بيجي ياخده من محلك ويدفع، أو بتوصله إذا عندك توصيل." },
];

const syria = [
  { title: "الاستلام من المحل هو الأساس", text: "ما عندك توصيل؟ عادي. الزبون بيطلب أونلاين وبيجي ياخد طلبه جاهز." },
  { title: "الدفع عند الاستلام", text: "ما في بطاقات ولا دفع أونلاين. الزبون بيدفع لما يستلم، متل ما متعودين." },
  { title: "بالليرة أو بالدولار", text: "سعّر بالعملة اللي بتشتغل فيها." },
  { title: "خفيف على النت الضعيف", text: "المتجر مصمم ليفتح بسرعة على الموبايل، حتى على باقة ضعيفة." },
  { title: "بدون عمولة على مبيعاتك", text: "اشتراك شهري ثابت، وكل ليرة بتبيعها إلك." },
  { title: "لوحة تحكم بالعربي وبسيطة", text: "إذا بتعرف تبعت صورة عالواتساب، بتعرف تدير متجرك." },
];

const faqs = [
  { q: "لازم يكون عندي توصيل؟", a: "لا. أغلب المحلات بتشتغل بالاستلام من المحل. وإذا بيوم بلشت توصيل، بتفعّله من الإعدادات وبتحط سعر لكل مدينة." },
  { q: "كيف بيدفع الزبون؟", a: "عند الاستلام، كاش. المنصة ما بتاخد ولا بتمسك مصاري الزبائن." },
  { q: "شو بصير بعد 14 يوم التجربة؟", a: "إذا عجبك بتدفع الاشتراك وبيكمل متجرك متل ما هو. إذا لا، بيتوقف لحاله وما بتدفع شي." },
  { q: "ما عندي وقت أرفع المنتجات.", a: "نحن منرفعلك ياهن ومنجهز المتجر كله، وإنت بس بتستلم الطلبات. تواصل معنا عالواتساب." },
  { q: "بتساعدوني جيب زبائن؟", a: "إيه، هي شغلتنا الأساسية: منعملك محتوى وإعلانات فيسبوك وانستغرام بتوصل الناس لمتجرك مباشرة." },
];

export default function PlatformHome() {
  return (
    <div className="nama font-sans">
      <style>{CSS}</style>

      <header className="nama-wrap flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2" aria-label={`${BRAND_AR} ${BRAND}`}>
          <Sprout />
          <span className="nama-display text-2xl leading-none">{BRAND_AR}</span>
          <span className="text-sm text-[var(--mute)]" dir="ltr">
            {BRAND}
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <a href="#how" className="hidden px-3 py-2 hover:underline sm:inline">
            كيف بيشتغل
          </a>
          <a href="#pricing" className="hidden px-3 py-2 hover:underline sm:inline">
            الأسعار
          </a>
          <Link href="/login" className="px-3 py-2 hover:underline">
            دخول
          </Link>
          <Link href="/signup" className="nama-btn !px-4 !py-2 text-sm">
            افتح متجرك
          </Link>
        </nav>
      </header>

      {/* Hero: the promise on one side, the moment it comes true on the other. */}
      <section className="nama-wrap grid items-center gap-10 pb-16 pt-8 lg:grid-cols-[1.15fr_1fr] lg:pt-16">
        <div>
          <h1 className="nama-display mb-6 text-[clamp(2.4rem,6vw,3.9rem)] leading-[1.15]">
            محلك صار أونلاين.
            <br />
            والطلبات بتوصلك عالواتساب.
          </h1>
          <p className="mb-8 max-w-xl text-lg leading-9 text-[var(--mute)]">
            {BRAND_AR} بتعطي محلك متجر إلكتروني بالعربي خلال دقيقتين. الزبون بيتفرج على منتجاتك وبيطلب من موبايله، وإنت بيوصلك الطلب مرتب، وبيجي ياخده من محلك ويدفع.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/signup" className="nama-btn text-lg">
              افتح متجرك، 14 يوم مجاناً
            </Link>
            <a href={helpLink} target={SUPPORT ? "_blank" : undefined} rel="noopener noreferrer" className="nama-btn-ghost text-lg">
              بدي تجهزولي ياه
            </a>
          </div>
          <p className="mt-4 text-sm text-[var(--mute)]">بدون بطاقة. بدون عمولة على مبيعاتك.</p>
        </div>

        <Phone />
      </section>

      <section id="how" className="nama-band py-16">
        <div className="nama-wrap">
          <h2 className="nama-display mb-10 text-3xl sm:text-4xl">من المحل للموبايل بتلات خطوات</h2>
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
        <h2 className="nama-display mb-3 text-3xl sm:text-4xl">معمول لطريقة البيع عنا</h2>
        <p className="mb-10 max-w-2xl text-lg leading-8 text-[var(--mute)]">ما نسخنا منصة أجنبية. بنيناها لمحل بحمص أو بالشام أو بحلب، بالشغلات اللي فعلاً بتفرق معه.</p>
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
            <h2 className="nama-display mb-4 text-3xl text-white sm:text-4xl">ما عندك وقت؟ نحن منبنيلك المتجر، ومنجيبلك الزبائن.</h2>
            <p className="mb-8 text-lg leading-9 text-white/75">فريقنا بيرفع منتجاتك، بيصمملك الصور والبوستات، وبيشغّلك إعلانات فيسبوك وانستغرام بتوصل الناس لمتجرك مباشرة. وإنت بتشتغل بمحلك.</p>
            <a href={helpLink} target={SUPPORT ? "_blank" : undefined} rel="noopener noreferrer" className="nama-btn-pist text-lg">
              احكينا عالواتساب
            </a>
          </div>
          <ul className="space-y-4 self-center">
            {[
              ["تجهيز المتجر", "منرفع منتجاتك بصورها وأسعارها، ومنرتب المتجر بهوية محلك."],
              ["محتوى وصور", "بوستات وريلز، وصور منتجات احترافية بالذكاء الاصطناعي."],
              ["إعلانات بتجيب طلبات", "حملات فيسبوك وانستغرام مربوطة بمتجرك، مع تقرير كل شهر بعدد الطلبات."],
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
        <h2 className="nama-display mb-3 text-3xl sm:text-4xl">سعر واضح، بدون عمولة</h2>
        <p className="mb-10 text-lg text-[var(--mute)]">جرّب 14 يوم بكل الميزات، وبعدين اختار.</p>
        <div className="grid gap-5 md:grid-cols-2">
          <Plan
            name="أساسي"
            price="15$"
            note="كل شي بيحتاجه محل ليبيع أونلاين"
            items={["متجر جاهز بقالب حسب نشاطك", "لغاية 100 منتج", "استلام من المحل وتوصيل", "الطلبات عالواتساب", "أكواد خصم وتقارير"]}
          />
          <Plan
            name="احترافي"
            price="29$"
            note="للمحل اللي كبر"
            featured
            items={["كل شي بالأساسي، ومنتجات بلا حدود", "حسابات لموظفينك", "لغاية 5 فروع، كل فرع بواتسابه", "فواتير وعروض أسعار PDF للزبون", "ربط إعلانات فيسبوك وانستغرام"]}
          />
        </div>
        <p className="mt-6 rounded-2xl bg-[var(--pist-soft)] p-4 leading-8">
          <b>سعر المؤسسين:</b> أول 50 محل بكل مدينة بياخدوا الأساسي بـ 10$ بالشهر، مدى الحياة. والدفع لـ 6 أشهر بيعطيك شهر مجاني.
        </p>
      </section>

      <section className="nama-band py-16">
        <div className="nama-wrap">
          <h2 className="nama-display mb-3 text-3xl sm:text-4xl">شوف بعينك</h2>
          <p className="mb-8 text-lg text-[var(--mute)]">متاجر تجريبية على المنصة. افتح أي واحد وجرب تطلب.</p>
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
        <h2 className="nama-display mb-8 text-3xl sm:text-4xl">أسئلة بتنسأل كتير</h2>
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
        <h2 className="nama-display mb-6 text-3xl sm:text-5xl">خلّي محلك ينمو.</h2>
        <Link href="/signup" className="nama-btn text-lg">
          افتح متجرك مجاناً
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
        <span className="nama-display text-5xl" dir="ltr">
          {price}
        </span>
        <span className={featured ? "text-white/70" : "text-[var(--mute)]"}>بالشهر</span>
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
        جرّب 14 يوم مجاناً
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
.nama-display{font-family:"Cairo",system-ui,sans-serif;font-weight:900;letter-spacing:-.01em}
.nama-band{background:#EAF0DE}
.nama-dark{background:var(--ink)}
.nama-btn,.nama-btn-ghost,.nama-btn-pist{display:inline-block;border-radius:999px;padding:.85rem 1.6rem;font-weight:600;transition:transform .15s ease}
.nama-btn{background:var(--leaf);color:#fff}
.nama-btn-ghost{box-shadow:inset 0 0 0 2px var(--ink);color:var(--ink)}
.nama-btn-pist{background:var(--pist);color:var(--ink)}
.nama-btn:hover,.nama-btn-ghost:hover,.nama-btn-pist:hover{transform:translateY(-1px)}
.nama a:focus-visible,.nama summary:focus-visible{outline:3px solid var(--leaf);outline-offset:3px;border-radius:8px}
.nama-step{flex:none;display:grid;place-items:center;width:3rem;height:3rem;border-radius:999px;background:var(--leaf);color:#fff;font-family:"Cairo",sans-serif;font-weight:900;font-size:1.4rem}
.nama-phone{border-radius:2.4rem;border:10px solid var(--ink);overflow:hidden;background:#fff;box-shadow:0 30px 60px -25px rgba(22,36,26,.45)}
.nama-chat{background:#ECE5DD;font-size:12.5px;line-height:1.7}
.nama-bubble{align-self:flex-start;max-width:92%;background:#DCF8C6;border-radius:12px 12px 12px 2px;padding:.6rem .75rem;color:#111;opacity:0;transform:translateY(14px);animation:nama-in .5s 1.6s cubic-bezier(.2,.8,.2,1) forwards}
.nama-typing{align-self:flex-start;display:flex;gap:4px;background:#fff;border-radius:12px;padding:.6rem .75rem;animation:nama-out .2s 1.5s forwards}
.nama-typing i{width:6px;height:6px;border-radius:50%;background:#999;animation:nama-dot 1s infinite}
.nama-typing i:nth-child(2){animation-delay:.15s}.nama-typing i:nth-child(3){animation-delay:.3s}
.nama-tag{position:absolute;top:5.5rem;left:-1.25rem;background:var(--pist);color:var(--ink);font-weight:600;font-size:.85rem;padding:.45rem .9rem;border-radius:999px;box-shadow:0 10px 25px -12px rgba(22,36,26,.5);opacity:0;animation:nama-in .4s 2.1s forwards}
@keyframes nama-in{to{opacity:1;transform:none}}
@keyframes nama-out{to{opacity:0;height:0;padding:0;margin:0}}
@keyframes nama-dot{50%{transform:translateY(-3px);opacity:.5}}
@media (prefers-reduced-motion:reduce){.nama-bubble,.nama-tag{animation:none;opacity:1;transform:none}.nama-typing{display:none}}
`;
