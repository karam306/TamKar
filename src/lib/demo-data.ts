import type { Collection, Product, Store } from "./types";

// Sample stores used when Supabase is not configured (demo mode).
// Each one shows a different template so merchants can compare.

export const demoStores: Store[] = [
  {
    id: "s-kitchen",
    slug: "demo",
    name: "بيت المطبخ",
    business_type: "home",
    social: { instagram: "https://instagram.com", facebook: "https://facebook.com" },
    tagline: "أدوات مطبخ وسفرة بجودة عالية",
    whatsapp: "963900000000",
    city: "حمص",
    currency: "USD",
    theme: "classic",
    primary_color: "#0f5c4d",
    delivery_note: "توصيل مجاني داخل حمص، والدفع عند الاستلام",
    status: "active",
    shipping: { delivery: true, pickup_note: "حمص، شارع الحضارة بجانب صيدلية الشفاء، من 10 صباحاً حتى 9 مساءً", default_fee: 3, free_over: 60, rates: [{ city: "حمص", fee: 0 }, { city: "حماة", fee: 2 }, { city: "دمشق", fee: 3 }] },
    sections: [
      { type: "announcement", text: "توصيل مجاني داخل حمص لجميع الطلبات" },
      {
        type: "hero",
        title: "مائدتك تستحق الأفضل",
        subtitle: "صحون وكؤوس وأدوات مطبخ مختارة بعناية، بأسعار مناسبة",
        image: "/demo/hero-kitchen.svg",
        buttonText: "تصفّح المنتجات",
      },
      { type: "categories", title: "تصفح حسب القسم" },
      { type: "featured_products", title: "الأكثر طلباً", limit: 8 },
      {
        type: "image_text",
        title: "من محلنا إلى بيتك",
        text: "نخدم أهل حمص منذ سنوات، والآن يمكنك الطلب من بيتك والدفع عند وصول طلبك.",
        image: "/demo/about-kitchen.svg",
      },
      {
        type: "testimonials",
        title: "آراء زبائننا",
        items: [
          { name: "أم محمد", text: "وصل الطقم في اليوم نفسه، وكان مطابقاً للصورة تماماً" },
          { name: "رنا", text: "أسعار ممتازة وتعامل راقٍ، وسأكرر الطلب بالتأكيد" },
          { name: "أبو سامر", text: "أول مرة أطلب عبر الإنترنت، وكانت التجربة سهلة جداً" },
        ],
      },
      { type: "whatsapp_cta", title: "لديك سؤال؟", text: "تواصل معنا عبر واتساب وسنرد عليك في أقرب وقت" },
    ],
  },
  {
    id: "s-fashion",
    slug: "lamar",
    name: "لمار",
    business_type: "clothing",
    social: { instagram: "https://instagram.com", tiktok: "https://tiktok.com" },
    tagline: "أزياء نسائية عصرية",
    whatsapp: "963900000000",
    city: "دمشق",
    currency: "USD",
    theme: "bold",
    primary_color: "#c2185b",
    delivery_note: "توصيل إلى جميع المحافظات خلال 2 إلى 4 أيام",
    status: "active",
    shipping: { delivery: true, pickup_note: "دمشق، الشعلان، من 11 صباحاً حتى 10 مساءً", default_fee: 4, free_over: 80, rates: [{ city: "دمشق", fee: 2 }, { city: "حلب", fee: 4 }, { city: "حمص", fee: 3 }] },
    sections: [
      { type: "announcement", text: "وصلت تشكيلة الشتاء" },
      {
        type: "hero",
        title: "إطلالتك تبدأ من هنا",
        subtitle: "قطع مختارة بتصاميم عصرية وخامات مريحة",
        image: "/demo/hero-fashion.svg",
        buttonText: "اكتشفي التشكيلة",
      },
      { type: "featured_products", title: "وصل حديثاً", limit: 8 },
      { type: "categories" },
      { type: "whatsapp_cta", title: "مترددة في اختيار المقاس؟", text: "راسلينا عبر واتساب وسنساعدك في الاختيار" },
    ],
  },
  {
    id: "s-sweets",
    slug: "halawet",
    name: "حلويات الياسمين",
    business_type: "food",
    tagline: "حلويات شامية طازجة كل يوم",
    whatsapp: "963900000000",
    city: "دمشق",
    currency: "SYP",
    theme: "soft",
    primary_color: "#8d5a2b",
    delivery_note: "اطلب قبل الساعة 2 ظهراً واستلم في اليوم نفسه",
    status: "active",
    sections: [
      {
        type: "hero",
        title: "مذاق الأصالة بأيدٍ معاصرة",
        subtitle: "معمول وبقلاوة وغريبة محضّرة بالسمن العربي",
        image: "/demo/hero-sweets.svg",
        buttonText: "اطلب الآن",
      },
      { type: "featured_products", title: "أصنافنا", limit: 8 },
      {
        type: "image_text",
        title: "طازج كل يوم",
        text: "نحضّر الحلويات كل صباح، ولا نبيع إلا منتجات اليوم.",
        image: "/demo/about-sweets.svg",
      },
      { type: "whatsapp_cta", title: "طلبيات المناسبات", text: "لطلبات الأعراس والمناسبات تواصل معنا عبر واتساب" },
    ],
  },
];

const p = (
  id: string,
  store_id: string,
  title: string,
  price: number,
  category: string,
  image: string,
  extra: Partial<Product> = {},
): Product => ({
  id,
  store_id,
  title,
  price,
  category,
  images: [image],
  active: true,
  stock: null,
  description: extra.description ?? "منتج مختار بعناية. تواصل معنا عبر واتساب لأي استفسار.",
  ...extra,
});

export const demoProducts: Product[] = [
  // Kitchen store
  p("k1", "s-kitchen", "طقم صحون سيراميك 18 قطعة", 34, "صحون", "/demo/k1.svg", { compare_at_price: 42, collection_ids: ["c-sets"] }),
  p("k2", "s-kitchen", "طقم ملاعق وشوك ستانلس 24 قطعة", 19, "ملاعق وشوك", "/demo/k2.svg", { collection_ids: ["c-sets"] }),
  p("k3", "s-kitchen", "كؤوس زجاج 6 قطع", 9.5, "كؤوس", "/demo/k3.svg"),
  p("k4", "s-kitchen", "قدر ضغط 7 لترات", 28, "قدور", "/demo/k4.svg", {
    compare_at_price: 35,
    specs: [
      { name: "الخامة", value: "ستانلس ستيل" },
      { name: "السعة", value: "7 لترات" },
      { name: "مناسبة لـ", value: "غاز وكهرباء وحث" },
      { name: "الكفالة", value: "سنة" },
    ],
  }),
  p("k5", "s-kitchen", "صينية تقديم خشب", 12, "تقديم", "/demo/k5.svg"),
  p("k6", "s-kitchen", "طقم فناجين قهوة عربية", 15, "كؤوس", "/demo/k6.svg"),
  p("k7", "s-kitchen", "طقم قدور جرانيت 5 قطع", 59, "قدور", "/demo/k7.svg", { collection_ids: ["c-sets"] }),
  p("k8", "s-kitchen", "سكاكين مطبخ مع حامل", 22, "ملاعق وشوك", "/demo/k8.svg"),
  // Fashion store
  p("f1", "s-fashion", "فستان صوف طويل", 38, "فساتين", "/demo/f1.svg", {
    compare_at_price: 48,
    options: [
      { name: "المقاس", values: ["S", "M", "L"] },
      { name: "اللون", values: ["أسود", "خمري"] },
    ],
    variants: ["S", "M", "L"].flatMap((size) =>
      ["أسود", "خمري"].map((color) => ({
        id: `f1-${size}-${color}`,
        title: `${size} / ${color}`,
        options: [size, color],
        price: size === "L" ? 42 : 38,
        compare_at_price: 48,
        stock: size === "S" && color === "خمري" ? 0 : null,
      })),
    ),
    collection_ids: ["c-new"],
  }),
  p("f2", "s-fashion", "جاكيت جينز", 32, "جاكيتات", "/demo/f2.svg", { collection_ids: ["c-new"] }),
  p("f3", "s-fashion", "بلوزة قطن", 14, "بلايز", "/demo/f3.svg"),
  p("f4", "s-fashion", "بنطال واسع", 21, "بناطيل", "/demo/f4.svg"),
  p("f5", "s-fashion", "شال كشمير", 11, "إكسسوارات", "/demo/f5.svg"),
  p("f6", "s-fashion", "معطف شتوي", 65, "جاكيتات", "/demo/f6.svg", { collection_ids: ["c-new"] }),
  // Sweets store
  p("h1", "s-sweets", "معمول تمر، كيلو", 95000, "معمول", "/demo/h1.svg"),
  p("h2", "s-sweets", "بقلاوة مشكلة، كيلو", 180000, "بقلاوة", "/demo/h2.svg"),
  p("h3", "s-sweets", "غريبة، نصف كيلو", 55000, "معمول", "/demo/h3.svg"),
  p("h4", "s-sweets", "بلورية فستق، كيلو", 240000, "بقلاوة", "/demo/h4.svg", { compare_at_price: 260000 }),
  p("h5", "s-sweets", "علبة ضيافة مشكلة", 150000, "علب هدايا", "/demo/h5.svg"),
  p("h6", "s-sweets", "مبرومة، كيلو", 210000, "بقلاوة", "/demo/h6.svg"),
];

export const demoCollections: Collection[] = [
  { id: "c-new", store_id: "s-fashion", title: "تشكيلة الشتاء", handle: "winter", description: "قطع دافئة لموسم البرد" },
  { id: "c-sets", store_id: "s-kitchen", title: "أطقم كاملة", handle: "sets", description: "أطقم جاهزة لمائدتك" },
];
