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

const COD = { icon: "💵", title: "الدفع عند الاستلام", text: "ادفع عند استلام طلبك" };
const WA = { icon: "💬", title: "دعم عبر واتساب", text: "نرد عليك بسرعة" };

export const TEMPLATES: Record<BusinessType, Template> = {
  clothing: {
    theme: "bold",
    color: "#111111",
    tagline: "أزياء عصرية بأسعار مناسبة",
    delivery: "اطلب عبر الإنترنت واستلم من المحل، والدفع عند الاستلام",
    hero: { title: "إطلالتك تبدأ من هنا", subtitle: "تشكيلات جديدة كل أسبوع، بخامات مريحة وتصاميم عصرية", button: "اكتشف التشكيلة" },
    options: ["المقاس", "اللون"],
    specs: ["الخامة", "طريقة الغسيل", "القصة"],
    productTypes: ["فساتين", "بلايز", "بناطيل", "جاكيتات", "أحذية", "أطفال"],
    features: [{ icon: "🏪", title: "اطلب واستلم", text: "جهّز طلبك عبر الإنترنت واستلمه من المحل" }, COD, { icon: "🔁", title: "تبديل المقاس", text: "خلال 3 أيام من الاستلام" }, WA],
    faq: [
      { q: "ماذا لو لم يناسبني المقاس؟", a: "يمكنك استبداله خلال 3 أيام من الاستلام، بشرط أن تكون القطعة بحالتها الأصلية." },
      { q: "كيف أعرف مقاسي؟", a: "أرسل إلينا طولك ووزنك عبر واتساب، وسنساعدك في الاختيار." },
      { q: "هل لديكم خدمة توصيل؟", a: "حالياً يتم الاستلام من المحل. وعند تفعيل التوصيل، سيظهر لك خياره في السلة." },
    ],
    extraPage: {
      title: "دليل المقاسات",
      handle: "size-guide",
      body: "## كيف تختار مقاسك\nقِس محيط الصدر والخصر والورك، وقارنها بالجدول.\n\nS: صدر 86 إلى 90 سم\nM: صدر 91 إلى 96 سم\nL: صدر 97 إلى 102 سم\nXL: صدر 103 إلى 108 سم\n\nإذا كنت متردداً بين مقاسين، فاختر الأكبر، أو تواصل معنا عبر واتساب.",
    },
  },
  accessories: {
    theme: "soft",
    color: "#9c6b3e",
    tagline: "إكسسوارات ومجوهرات تكمّل إطلالتك",
    delivery: "تغليف هدايا مجاني، والدفع عند الاستلام",
    hero: { title: "تفاصيل صغيرة تصنع الفرق", subtitle: "إكسسوارات ومجوهرات مختارة، وتغليف هدايا مجاني", button: "تصفّح المجموعة" },
    options: ["اللون", "الخامة", "المقاس"],
    specs: ["الخامة", "الطلاء", "الطول", "الوزن"],
    productTypes: ["أساور", "قلادات", "حلق", "خواتم", "ساعات", "شنط"],
    features: [{ icon: "🎁", title: "تغليف هدية مجاني", text: "مع كل طلب" }, COD, { icon: "✨", title: "خامات مضمونة", text: "لا تتغير مع الوقت" }, WA],
    faq: [
      { q: "هل يتوفر تغليف هدايا؟", a: "نعم، تصل جميع الطلبات بتغليف هدايا مجاني." },
      { q: "ما نوع الخامة؟", a: "مذكور في وصف كل منتج، ولأي استفسار تواصل معنا." },
    ],
  },
  phones: {
    theme: "classic",
    color: "#1f4fd1",
    tagline: "هواتف وإكسسوارات أصلية بكفالة",
    delivery: "كفالة على كل الأجهزة، والدفع عند الاستلام",
    hero: { title: "أحدث الهواتف بين يديك", subtitle: "أجهزة أصلية بكفالة، وإكسسوارات بأسعار منافسة", button: "تصفّح الأجهزة" },
    options: ["السعة", "اللون", "الحالة"],
    specs: ["الشاشة", "المعالج", "الذاكرة", "الكاميرا", "البطارية", "الكفالة"],
    productTypes: ["هواتف", "سماعات", "شواحن", "أغطية", "ساعات ذكية", "أجهزة لوحية"],
    features: [{ icon: "🛡️", title: "كفالة", text: "على كل الأجهزة" }, { icon: "✅", title: "أصلي 100%", text: "مع العلبة الأصلية" }, COD, WA],
    faq: [
      { q: "هل الأجهزة جديدة أم مستعملة؟", a: "الحالة مذكورة لكل جهاز. الجديد بعلبته الأصلية، والمستعمل مفحوص." },
      { q: "ما مدة الكفالة؟", a: "مذكورة في مواصفات كل جهاز، وتشمل عيوب الصناعة." },
      { q: "هل يمكنني فحص الجهاز قبل الدفع؟", a: "بالتأكيد، تفحصه عند الاستلام ثم تدفع." },
    ],
    extraPage: { title: "الكفالة", handle: "warranty", body: "## سياسة الكفالة\nجميع الأجهزة مكفولة ضد عيوب الصناعة للمدة المذكورة في مواصفات الجهاز.\n\nلا تشمل الكفالة الكسر أو تلف الماء أو سوء الاستخدام.\n\nلطلب الكفالة تواصل معنا عبر واتساب مع رقم الطلب." },
  },
  computers: {
    theme: "classic",
    color: "#0f766e",
    tagline: "حواسيب محمولة وقطع حاسوب بأفضل الأسعار",
    delivery: "تجميع وفحص قبل التسليم، والدفع عند الاستلام",
    hero: { title: "جهازك القادم هنا", subtitle: "حواسيب محمولة وقطع وتجميعات حسب طلبك، مع كفالة", button: "تصفّح المنتجات" },
    options: ["المعالج", "الذاكرة", "التخزين"],
    specs: ["المعالج", "الذاكرة", "التخزين", "البطاقة الرسومية", "الشاشة", "نظام التشغيل", "الكفالة"],
    productTypes: ["حواسيب محمولة", "معالجات", "بطاقات رسومية", "ذواكر RAM", "أقراص SSD", "شاشات", "إكسسوارات"],
    features: [{ icon: "🛠️", title: "فحص قبل التسليم", text: "يُختبر كل جهاز" }, { icon: "🛡️", title: "كفالة", text: "على القطع والأجهزة" }, COD, WA],
    faq: [
      { q: "هل يمكنكم تجميع جهاز لي؟", a: "بالتأكيد، أرسل إلينا ميزانيتك واستخدامك عبر واتساب وسنقترح عليك." },
      { q: "هل القطع متوافقة مع جهازي؟", a: "أرسل إلينا طراز جهازك وسنتحقق من التوافق قبل الطلب." },
    ],
    extraPage: { title: "الكفالة", handle: "warranty", body: "## سياسة الكفالة\nالقطع والأجهزة مكفولة ضد عيوب الصناعة وفق ما هو مذكور في كل منتج.\n\nلطلب الكفالة تواصل معنا عبر واتساب مع رقم الطلب." },
  },
  food: {
    theme: "soft",
    color: "#b4441b",
    tagline: "طازج كل يوم، من مطبخنا إلى بيتك",
    delivery: "اطلب قبل الساعة 2 ظهراً واستلم في اليوم نفسه",
    hero: { title: "مذاق لا يُنسى", subtitle: "يُحضَّر طازجاً كل يوم بأجود المكونات", button: "اطلب الآن" },
    options: ["الحجم", "الوزن", "النكهة"],
    specs: ["المكونات", "الوزن", "مدة الصلاحية", "طريقة الحفظ"],
    productTypes: ["وجبات", "حلويات", "معجنات", "مشروبات", "علب ضيافة"],
    features: [{ icon: "🔥", title: "طازج كل يوم", text: "يُحضَّر يومياً" }, { icon: "🏪", title: "جاهز في اليوم نفسه", text: "اطلب واستلم من المحل" }, COD, WA],
    faq: [
      { q: "متى يصل الطلب؟", a: "في اليوم نفسه إذا طلبت قبل الساعة 2 ظهراً." },
      { q: "هل تقبلون طلبات المناسبات؟", a: "بالتأكيد، تواصل معنا عبر واتساب قبل يومين على الأقل." },
    ],
  },
  beauty: {
    theme: "soft",
    color: "#a23b72",
    tagline: "عطور ومستحضرات تجميل أصلية",
    delivery: "منتجات أصلية، والدفع عند الاستلام",
    hero: { title: "عناية تليق بك", subtitle: "عطور ومستحضرات أصلية من أشهر العلامات التجارية", button: "تصفّح المنتجات" },
    options: ["الحجم", "اللون", "الرائحة"],
    specs: ["الحجم", "نوع البشرة", "المكونات", "بلد المنشأ"],
    productTypes: ["عطور", "مكياج", "عناية بالبشرة", "عناية بالشعر", "هدايا"],
    features: [{ icon: "✅", title: "أصلي 100%", text: "من مصادر موثوقة" }, { icon: "🎁", title: "تغليف هدية", text: "عند الطلب" }, COD, WA],
    faq: [
      { q: "هل المنتجات أصلية؟", a: "نعم، جميع منتجاتنا أصلية ومن مصادر موثوقة." },
      { q: "كيف أعرف ما يناسب بشرتي؟", a: "تواصل معنا عبر واتساب وسنساعدك في الاختيار." },
    ],
  },
  home: {
    theme: "classic",
    color: "#0f5c4d",
    tagline: "كل ما يحتاجه بيتك ومطبخك",
    delivery: "اطلب عبر الإنترنت واستلم من المحل، والدفع عند الاستلام",
    hero: { title: "بيتك يستحق الأفضل", subtitle: "أدوات منزلية ومطبخية بجودة عالية وأسعار مناسبة", button: "تصفّح المنتجات" },
    options: ["اللون", "الحجم", "العدد"],
    specs: ["الخامة", "الأبعاد", "عدد القطع", "بلد المنشأ"],
    productTypes: ["صحون", "قدور", "كؤوس", "أدوات مطبخ", "تخزين", "ديكور"],
    features: [{ icon: "🏪", title: "اطلب واستلم", text: "جهّز طلبك عبر الإنترنت واستلمه من المحل" }, { icon: "✅", title: "جودة مضمونة", text: "منتجات مختارة" }, COD, WA],
    faq: [
      { q: "ماذا لو وصلت قطعة مكسورة؟", a: "صوّرها وأرسلها إلينا عبر واتساب، وسنستبدلها." },
      { q: "هل لديكم خدمة توصيل؟", a: "حالياً يتم الاستلام من المحل. وعند تفعيل التوصيل، سيظهر لك خياره في السلة." },
    ],
  },
  general: {
    theme: "classic",
    color: "#0f5c4d",
    tagline: "منتجات مختارة، والدفع عند الاستلام",
    delivery: "اطلب عبر الإنترنت واستلم من المحل، والدفع عند الاستلام",
    hero: { title: "أهلاً بك في متجرنا", subtitle: "اكتشف منتجاتنا واطلب بسهولة، والدفع عند الاستلام", button: "تصفّح المنتجات" },
    options: ["اللون", "الحجم", "المقاس"],
    specs: ["الخامة", "الأبعاد", "الوزن"],
    productTypes: [],
    features: [{ icon: "🏪", title: "اطلب واستلم", text: "جهّز طلبك عبر الإنترنت واستلمه من المحل" }, COD, { icon: "✅", title: "جودة مضمونة", text: "منتجات مختارة" }, WA],
    faq: [
      { q: "كيف أدفع؟", a: "نقداً عند استلام الطلب." },
      { q: "هل لديكم خدمة توصيل؟", a: "حالياً يتم الاستلام من المحل. وعند تفعيل التوصيل، سيظهر لك خياره في السلة." },
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
    { type: "whatsapp_cta", title: `لديك سؤال عن ${storeName}؟`, text: "تواصل معنا عبر واتساب وسنرد عليك في أقرب وقت" },
  ];
}

/** Pages every new store starts with. */
export function templatePages(type: string | null | undefined, storeName: string) {
  const t = templateFor(type);
  const pages = [
    {
      title: "من نحن",
      handle: "about",
      body: `## أهلاً بك في ${storeName}\n${t.tagline}.\n\nاكتب هنا قصة متجرك: متى بدأت، وما الذي يميّزك، ولماذا يعود إليك الزبائن.`,
    },
    {
      title: "الاستلام والدفع",
      handle: "shipping",
      body: `## الاستلام\n${t.delivery}.\n\nبعد الطلب نتواصل معك عبر واتساب لتأكيده والاتفاق على موعد الاستلام. وإذا توفّر التوصيل إلى منطقتك، يمكنك اختياره في السلة.\n\n## الدفع\nالدفع نقداً عند الاستلام، إذ تفحص طلبك ثم تدفع.`,
    },
    {
      title: "سياسة الإرجاع والاستبدال",
      handle: "returns",
      body: "## الإرجاع والاستبدال\nيمكنك طلب الاستبدال أو الإرجاع خلال 3 أيام من الاستلام، بشرط أن يكون المنتج بحالته الأصلية.\n\nلتقديم الطلب تواصل معنا عبر واتساب مع رقم الطلب وصورة المنتج.",
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
