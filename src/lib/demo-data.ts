import type { Collection, Product, Store } from "./types";

// Sample stores used when Supabase is not configured (demo mode).
// Each one shows a different template so merchants can compare.

export const demoStores: Store[] = [
  {
    id: "s-kitchen",
    slug: "demo",
    name: "بيت المطبخ",
    tagline: "أدوات مطبخ وسفرة بجودة عالية",
    whatsapp: "963900000000",
    city: "حمص",
    currency: "USD",
    theme: "classic",
    primary_color: "#0f5c4d",
    delivery_note: "توصيل مجاني داخل حمص، والدفع عند الاستلام",
    status: "active",
    shipping: { default_fee: 3, free_over: 60, rates: [{ city: "حمص", fee: 0 }, { city: "حماة", fee: 2 }, { city: "دمشق", fee: 3 }] },
    sections: [
      { type: "announcement", text: "توصيل مجاني داخل حمص لكل الطلبات" },
      {
        type: "hero",
        title: "سفرتك بتستاهل الأحلى",
        subtitle: "صحون، كاسات، وأدوات مطبخ مختارة بعناية، بأسعار بتناسبك",
        image: "/demo/hero-kitchen.svg",
        buttonText: "شوف المنتجات",
      },
      { type: "categories", title: "تصفح حسب القسم" },
      { type: "featured_products", title: "الأكثر طلباً", limit: 8 },
      {
        type: "image_text",
        title: "من محلنا لبيتك",
        text: "صار لنا سنين بنخدم أهل حمص، وهلق صار فيك تطلب من بيتك وتدفع لما يوصلك الطلب.",
        image: "/demo/about-kitchen.svg",
      },
      {
        type: "testimonials",
        title: "شو قالوا زباينا",
        items: [
          { name: "أم محمد", text: "الطقم وصل بنفس اليوم ومتل الصورة تماماً" },
          { name: "رنا", text: "أسعار ممتازة وتعامل محترم، أكيد رح عيد الطلب" },
          { name: "أبو سامر", text: "أول مرة بطلب أونلاين وكانت التجربة سهلة كتير" },
        ],
      },
      { type: "whatsapp_cta", title: "عندك سؤال؟", text: "احكينا على واتساب ومنرد عليك بسرعة" },
    ],
  },
  {
    id: "s-fashion",
    slug: "lamar",
    name: "لمار",
    tagline: "أزياء نسائية عصرية",
    whatsapp: "963900000000",
    city: "دمشق",
    currency: "USD",
    theme: "bold",
    primary_color: "#c2185b",
    delivery_note: "توصيل لكل المحافظات خلال 2 إلى 4 أيام",
    status: "active",
    shipping: { default_fee: 4, free_over: 80, rates: [{ city: "دمشق", fee: 2 }, { city: "حلب", fee: 4 }, { city: "حمص", fee: 3 }] },
    sections: [
      { type: "announcement", text: "تشكيلة الشتاء وصلت" },
      {
        type: "hero",
        title: "إطلالتك تبدأ من هون",
        subtitle: "قطع مختارة بتصاميم عصرية وخامات مريحة",
        image: "/demo/hero-fashion.svg",
        buttonText: "اكتشفي التشكيلة",
      },
      { type: "featured_products", title: "وصل حديثاً", limit: 8 },
      { type: "categories" },
      { type: "whatsapp_cta", title: "محتارة بالمقاس؟", text: "ابعتيلنا على واتساب ومنساعدك تختاري" },
    ],
  },
  {
    id: "s-sweets",
    slug: "halawet",
    name: "حلويات الياسمين",
    tagline: "حلويات شامية طازة كل يوم",
    whatsapp: "963900000000",
    city: "دمشق",
    currency: "SYP",
    theme: "soft",
    primary_color: "#8d5a2b",
    delivery_note: "توصيل داخل دمشق، اطلب قبل الساعة 2 الظهر",
    status: "active",
    sections: [
      {
        type: "hero",
        title: "طعمة زمان، بإيدين اليوم",
        subtitle: "معمول، بقلاوة، وغريبة محضرة بالسمنة العربية",
        image: "/demo/hero-sweets.svg",
        buttonText: "اطلب هلق",
      },
      { type: "featured_products", title: "أصنافنا", limit: 8 },
      {
        type: "image_text",
        title: "كل يوم طازة",
        text: "منحضّر الحلويات كل صباح، وما منبيع شي من مبارح.",
        image: "/demo/about-sweets.svg",
      },
      { type: "whatsapp_cta", title: "طلبيات المناسبات", text: "للأعراس والمناسبات احكينا على واتساب" },
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
  description: extra.description ?? "منتج مختار بعناية. تواصل معنا على واتساب لأي استفسار.",
  ...extra,
});

export const demoProducts: Product[] = [
  // Kitchen store
  p("k1", "s-kitchen", "طقم صحون سيراميك 18 قطعة", 34, "صحون", "/demo/k1.svg", { compare_at_price: 42, collection_ids: ["c-sets"] }),
  p("k2", "s-kitchen", "طقم ملاعق وشوك ستانلس 24 قطعة", 19, "ملاعق وشوك", "/demo/k2.svg", { collection_ids: ["c-sets"] }),
  p("k3", "s-kitchen", "كاسات زجاج 6 قطع", 9.5, "كاسات", "/demo/k3.svg"),
  p("k4", "s-kitchen", "طنجرة ضغط 7 لتر", 28, "طناجر", "/demo/k4.svg", { compare_at_price: 35 }),
  p("k5", "s-kitchen", "صينية تقديم خشب", 12, "تقديم", "/demo/k5.svg"),
  p("k6", "s-kitchen", "طقم فناجين قهوة عربية", 15, "كاسات", "/demo/k6.svg"),
  p("k7", "s-kitchen", "طقم طناجر جرانيت 5 قطع", 59, "طناجر", "/demo/k7.svg", { collection_ids: ["c-sets"] }),
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
  p("h3", "s-sweets", "غريبة، نص كيلو", 55000, "معمول", "/demo/h3.svg"),
  p("h4", "s-sweets", "بلورية فستق، كيلو", 240000, "بقلاوة", "/demo/h4.svg", { compare_at_price: 260000 }),
  p("h5", "s-sweets", "علبة ضيافة مشكلة", 150000, "علب هدايا", "/demo/h5.svg"),
  p("h6", "s-sweets", "مبرومة، كيلو", 210000, "بقلاوة", "/demo/h6.svg"),
];

export const demoCollections: Collection[] = [
  { id: "c-new", store_id: "s-fashion", title: "تشكيلة الشتاء", handle: "winter", description: "قطع دافية لموسم البرد" },
  { id: "c-sets", store_id: "s-kitchen", title: "أطقم كاملة", handle: "sets", description: "أطقم جاهزة لسفرتك" },
];
