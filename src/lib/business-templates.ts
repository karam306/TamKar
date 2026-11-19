import type { BusinessType } from "./business-types";
import type { Section, ThemeId } from "./types";

// Ready-made starting point for each kind of shop. Everything can be changed later.

type Template = {
  theme: ThemeId;
  color: string;
  tagline: string;
  delivery: string;
  hero: { title: string; subtitle: string; button: string };
  options: string[]; // option names suggested in the product editor
  specs: string[]; // spec rows suggested in the product editor
  productTypes: string[];
  features: { icon: string; title: string; text: string }[];
  faq: { q: string; a: string }[];
  extraPage?: { title: string; handle: string; body: string };
};

const COD = { icon: "💵", title: "الدفع عند الاستلام", text: "ادفع لما يوصلك طلبك" };
const WA = { icon: "💬", title: "دعم على واتساب", text: "منرد عليك بسرعة" };

export const TEMPLATES: Record<BusinessType, Template> = {
  clothing: {
    theme: "bold",
    color: "#111111",
    tagline: "أزياء عصرية بأسعار بتناسبك",
    delivery: "توصيل لكل المحافظات خلال 2 إلى 4 أيام",
    hero: { title: "إطلالتك بتبلش من هون", subtitle: "تشكيلات جديدة كل أسبوع، بخامات مريحة وتصاميم عصرية", button: "اكتشف التشكيلة" },
    options: ["المقاس", "اللون"],
    specs: ["الخامة", "طريقة الغسيل", "القصة"],
    productTypes: ["فساتين", "بلايز", "بناطيل", "جاكيتات", "أحذية", "أطفال"],
    features: [{ icon: "🚚", title: "توصيل لكل سوريا", text: "خلال 2 لـ 4 أيام" }, COD, { icon: "🔁", title: "تبديل المقاس", text: "خلال 3 أيام من الاستلام" }, WA],
    faq: [
      { q: "إذا المقاس ما ظبط؟", a: "فيك تبدّله خلال 3 أيام من الاستلام، بشرط القطعة تكون بحالتها." },
      { q: "كيف بعرف مقاسي؟", a: "ابعتلنا طولك ووزنك على واتساب ومنساعدك تختار." },
      { q: "قديش بياخد التوصيل؟", a: "من يومين لـ 4 أيام حسب المدينة." },
    ],
    extraPage: {
      title: "دليل المقاسات",
      handle: "size-guide",
      body: "## كيف تختار مقاسك\nقيس محيط الصدر والخصر والورك، وقارنهم مع الجدول.\n\nS: صدر 86 إلى 90 سم\nM: صدر 91 إلى 96 سم\nL: صدر 97 إلى 102 سم\nXL: صدر 103 إلى 108 سم\n\nإذا محتار بين مقاسين، اختار الأكبر، أو احكينا على واتساب.",
    },
  },
  accessories: {
    theme: "soft",
    color: "#9c6b3e",
    tagline: "إكسسوارات ومجوهرات بتكمّل إطلالتك",
    delivery: "تغليف هدايا مجاني، والدفع عند الاستلام",
    hero: { title: "تفاصيل صغيرة بتعمل فرق", subtitle: "إكسسوارات ومجوهرات مختارة، وتغليف هدية مجاني", button: "شوف المجموعة" },
    options: ["اللون", "الخامة", "المقاس"],
    specs: ["الخامة", "الطلاء", "الطول", "الوزن"],
    productTypes: ["أساور", "قلادات", "حلق", "خواتم", "ساعات", "شنط"],
    features: [{ icon: "🎁", title: "تغليف هدية مجاني", text: "مع كل طلب" }, COD, { icon: "✨", title: "خامات مضمونة", text: "ما بتتغير مع الوقت" }, WA],
    faq: [
      { q: "هل في تغليف هدية؟", a: "نعم، كل الطلبات بتوصل بتغليف هدية مجاني." },
      { q: "شو نوع الخامة؟", a: "مكتوب بوصف كل منتج، وإذا عندك سؤال احكينا." },
    ],
  },
  phones: {
    theme: "classic",
    color: "#1f4fd1",
    tagline: "موبايلات وإكسسوارات أصلية بكفالة",
    delivery: "كفالة على كل الأجهزة، والدفع عند الاستلام",
    hero: { title: "أحدث الموبايلات بين إيديك", subtitle: "أجهزة أصلية بكفالة، وإكسسوارات بأسعار منافسة", button: "شوف الأجهزة" },
    options: ["السعة", "اللون", "الحالة"],
    specs: ["الشاشة", "المعالج", "الرام", "الكاميرا", "البطارية", "الكفالة"],
    productTypes: ["موبايلات", "سماعات", "شواحن", "كفرات", "ساعات ذكية", "تابلت"],
    features: [{ icon: "🛡️", title: "كفالة", text: "على كل الأجهزة" }, { icon: "✅", title: "أصلي 100%", text: "مع الكرتونة" }, COD, WA],
    faq: [
      { q: "الأجهزة جديدة ولا مستعملة؟", a: "مكتوب بحالة كل جهاز. الجديد بكرتونته والمستعمل مفحوص." },
      { q: "شو الكفالة؟", a: "مكتوبة بمواصفات كل جهاز، وبتشمل عيوب الصناعة." },
      { q: "فيني أفحص الجهاز قبل ما أدفع؟", a: "أكيد، بتفحصه عند الاستلام وبعدين بتدفع." },
    ],
    extraPage: { title: "الكفالة", handle: "warranty", body: "## سياسة الكفالة\nكل الأجهزة عليها كفالة ضد عيوب الصناعة حسب المدة المكتوبة بمواصفات الجهاز.\n\nالكفالة ما بتشمل الكسر أو الماء أو سوء الاستخدام.\n\nلطلب الكفالة تواصل معنا على واتساب مع رقم الطلب." },
  },
  computers: {
    theme: "classic",
    color: "#0f766e",
    tagline: "لابتوبات وقطع كمبيوتر بأفضل الأسعار",
    delivery: "تجميع وفحص قبل التسليم، والدفع عند الاستلام",
    hero: { title: "جهازك الجاي هون", subtitle: "لابتوبات، قطع، وتجميعات حسب طلبك مع كفالة", button: "شوف المنتجات" },
    options: ["المعالج", "الرام", "التخزين"],
    specs: ["المعالج", "الرام", "التخزين", "كرت الشاشة", "الشاشة", "نظام التشغيل", "الكفالة"],
    productTypes: ["لابتوبات", "معالجات", "كروت شاشة", "رامات", "هاردات SSD", "شاشات", "إكسسوارات"],
    features: [{ icon: "🛠️", title: "فحص قبل التسليم", text: "كل جهاز بيتجرب" }, { icon: "🛡️", title: "كفالة", text: "على القطع والأجهزة" }, COD, WA],
    faq: [
      { q: "فيكن تجمعولي جهاز؟", a: "أكيد، ابعتلنا ميزانيتك واستخدامك على واتساب ومنقترح عليك." },
      { q: "القطع متوافقة مع جهازي؟", a: "ابعتلنا موديل جهازك ومنتأكد قبل ما تطلب." },
    ],
    extraPage: { title: "الكفالة", handle: "warranty", body: "## سياسة الكفالة\nالقطع والأجهزة عليها كفالة ضد عيوب الصناعة حسب المكتوب بكل منتج.\n\nلطلب الكفالة تواصل معنا على واتساب مع رقم الطلب." },
  },
  food: {
    theme: "soft",
    color: "#b4441b",
    tagline: "طازة كل يوم، ومن مطبخنا لبيتك",
    delivery: "توصيل بنفس اليوم، اطلب قبل الساعة 2 الظهر",
    hero: { title: "طعمة بتتذكرها", subtitle: "محضّر طازة كل يوم بأجود المكونات", button: "اطلب هلق" },
    options: ["الحجم", "الوزن", "النكهة"],
    specs: ["المكونات", "الوزن", "مدة الصلاحية", "طريقة الحفظ"],
    productTypes: ["وجبات", "حلويات", "معجنات", "مشروبات", "علب ضيافة"],
    features: [{ icon: "🔥", title: "طازة كل يوم", text: "ما منبيع شي من مبارح" }, { icon: "🛵", title: "توصيل بنفس اليوم", text: "داخل المدينة" }, COD, WA],
    faq: [
      { q: "إيمتى بيوصل الطلب؟", a: "بنفس اليوم إذا طلبت قبل الساعة 2 الظهر." },
      { q: "بتعملوا طلبيات للمناسبات؟", a: "أكيد، احكينا على واتساب قبل بيومين على الأقل." },
    ],
  },
  beauty: {
    theme: "soft",
    color: "#a23b72",
    tagline: "عطور ومستحضرات تجميل أصلية",
    delivery: "منتجات أصلية، والدفع عند الاستلام",
    hero: { title: "اهتمي بحالك", subtitle: "عطور ومستحضرات أصلية من أشهر الماركات", button: "شوفي المنتجات" },
    options: ["الحجم", "اللون", "الرائحة"],
    specs: ["الحجم", "نوع البشرة", "المكونات", "بلد المنشأ"],
    productTypes: ["عطور", "مكياج", "عناية بالبشرة", "عناية بالشعر", "هدايا"],
    features: [{ icon: "✅", title: "أصلي 100%", text: "من مصادر موثوقة" }, { icon: "🎁", title: "تغليف هدية", text: "عند الطلب" }, COD, WA],
    faq: [
      { q: "المنتجات أصلية؟", a: "نعم، كل منتجاتنا أصلية ومن مصادر موثوقة." },
      { q: "فيني أعرف شو بيناسب بشرتي؟", a: "احكينا على واتساب ومنساعدك تختاري." },
    ],
  },
  home: {
    theme: "classic",
    color: "#0f5c4d",
    tagline: "كل شي بيلزم بيتك ومطبخك",
    delivery: "توصيل لكل المحافظات، والدفع عند الاستلام",
    hero: { title: "بيتك بيستاهل الأحلى", subtitle: "أدوات منزلية ومطبخ بجودة عالية وأسعار بتناسبك", button: "شوف المنتجات" },
    options: ["اللون", "الحجم", "العدد"],
    specs: ["الخامة", "الأبعاد", "عدد القطع", "بلد المنشأ"],
    productTypes: ["صحون", "طناجر", "كاسات", "أدوات مطبخ", "تخزين", "ديكور"],
    features: [{ icon: "🚚", title: "توصيل لكل سوريا", text: "مع تغليف آمن" }, { icon: "✅", title: "جودة مضمونة", text: "منتجات مختارة" }, COD, WA],
    faq: [
      { q: "إذا وصلت قطعة مكسورة؟", a: "صوّرها وابعتلنا على واتساب ومنبدّلها." },
      { q: "قديش بياخد التوصيل؟", a: "من يوم لـ 3 أيام حسب المدينة." },
    ],
  },
  general: {
    theme: "classic",
    color: "#0f5c4d",
    tagline: "منتجات مختارة، والدفع عند الاستلام",
    delivery: "توصيل لكل المحافظات، والدفع عند الاستلام",
    hero: { title: "أهلاً فيك بمتجرنا", subtitle: "اكتشف منتجاتنا واطلب بكل سهولة، والدفع عند الاستلام", button: "شوف المنتجات" },
    options: ["اللون", "الحجم", "المقاس"],
    specs: ["الخامة", "الأبعاد", "الوزن"],
    productTypes: [],
    features: [{ icon: "🚚", title: "توصيل سريع", text: "لكل المحافظات" }, COD, { icon: "✅", title: "جودة مضمونة", text: "منتجات مختارة" }, WA],
    faq: [
      { q: "كيف بدفع؟", a: "نقداً عند استلام الطلب." },
      { q: "قديش بياخد التوصيل؟", a: "من يوم لـ 3 أيام حسب المدينة." },
    ],
  },
};

export const templateFor = (type?: string | null): Template => TEMPLATES[(type as BusinessType) ?? "general"] ?? TEMPLATES.general;

/** Home page sections for a new store of this type. */
export function templateSections(type: string | null | undefined, storeName: string): Section[] {
  const t = templateFor(type);
  return [
    { type: "announcement", text: t.delivery },
    { type: "hero", title: t.hero.title, subtitle: t.hero.subtitle, buttonText: t.hero.button },
    { type: "features", items: t.features },
    { type: "categories", title: "تصفح حسب القسم" },
    { type: "featured_products", title: "منتجاتنا", limit: 8 },
    { type: "faq", title: "أسئلة شائعة", items: t.faq },
    { type: "whatsapp_cta", title: `عندك سؤال عن ${storeName}؟`, text: "احكينا على واتساب ومنرد عليك بسرعة" },
  ];
}

/** Pages every new store starts with. */
export function templatePages(type: string | null | undefined, storeName: string) {
  const t = templateFor(type);
  const pages = [
    {
      title: "من نحن",
      handle: "about",
      body: `## أهلاً فيك بـ ${storeName}\n${t.tagline}.\n\nاحكي هون قصة متجرك: إيمتى بلّشت، شو بيميزك، وليش الزبائن بيرجعولك.`,
    },
    {
      title: "التوصيل والدفع",
      handle: "shipping",
      body: `## التوصيل\n${t.delivery}.\n\nبعد ما تطلب منتواصل معك على واتساب لنأكد الطلب ونتفق على موعد التوصيل.\n\n## الدفع\nالدفع نقداً عند الاستلام. بتفحص طلبك وبعدين بتدفع.`,
    },
    {
      title: "سياسة الإرجاع والاستبدال",
      handle: "returns",
      body: "## الإرجاع والاستبدال\nفيك تطلب استبدال أو إرجاع خلال 3 أيام من الاستلام، بشرط المنتج يكون بحالته الأصلية.\n\nللطلب تواصل معنا على واتساب مع رقم الطلب وصورة المنتج.",
    },
  ];
  if (t.extraPage) pages.push(t.extraPage);
  return pages;
}

export function templateMenus(pages: { title: string; handle: string }[]) {
  return {
    header: [
      { label: "الرئيسية", href: "/" },
      { label: "كل المنتجات", href: "/products" },
      { label: "من نحن", href: "/pages/about" },
    ],
    footer: pages.map((p) => ({ label: p.title, href: `/pages/${p.handle}` })),
  };
}
