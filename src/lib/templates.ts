import type { Section, SectionType, ThemeId } from "./types";

export const THEMES: { id: ThemeId; name: string; description: string; color: string }[] = [
  { id: "classic", name: "الكلاسيكي", description: "هادئ ومنظّم، يناسب معظم المتاجر", color: "#0f5c4d" },
  { id: "bold", name: "الجريء", description: "خط عريض وزوايا حادة، للأزياء والإلكترونيات", color: "#c2185b" },
  { id: "soft", name: "الناعم", description: "ألوان دافئة وزوايا دائرية، للحلويات والهدايا", color: "#8d5a2b" },
];

export const SECTION_LABELS: Record<SectionType, string> = {
  announcement: "شريط إعلان",
  hero: "البانر الرئيسي",
  categories: "التصنيفات",
  featured_products: "المنتجات",
  image_text: "صورة ونص",
  testimonials: "آراء الزبائن",
  whatsapp_cta: "زر واتساب",
  collection_products: "منتجات من مجموعة",
  image_banner: "بانر صورة",
  features: "مميزات المتجر",
  faq: "أسئلة شائعة",
  rich_text: "نص",
};

export function newSection(type: SectionType): Section {
  switch (type) {
    case "announcement":
      return { type, text: "توصيل إلى جميع المحافظات" };
    case "hero":
      return { type, title: "أهلاً بكم في متجرنا", subtitle: "اكتشف منتجاتنا واطلب بسهولة", buttonText: "تصفّح المنتجات" };
    case "categories":
      return { type, title: "تصفح حسب القسم" };
    case "featured_products":
      return { type, title: "منتجاتنا", limit: 8 };
    case "image_text":
      return { type, title: "من نحن", text: "عرّف زبائنك بقصة متجرك وما يميّزه." };
    case "testimonials":
      return { type, title: "آراء زبائننا", items: [{ name: "زبون", text: "تجربة ممتازة وتوصيل سريع" }] };
    case "whatsapp_cta":
      return { type, title: "لديك سؤال؟", text: "تواصل معنا عبر واتساب وسنرد عليك في أقرب وقت" };
    case "collection_products":
      return { type, title: "وصل حديثاً", limit: 8 };
    case "image_banner":
      return { type, title: "عرض خاص", text: "خصومات لفترة محدودة", buttonText: "اطّلع على العرض", link: "/products" };
    case "features":
      return {
        type,
        items: [
          { icon: "🚚", title: "توصيل سريع", text: "إلى جميع المحافظات" },
          { icon: "💵", title: "الدفع عند الاستلام", text: "ادفع عند استلام طلبك" },
          { icon: "✅", title: "جودة مضمونة", text: "منتجات أصلية" },
          { icon: "💬", title: "دعم عبر واتساب", text: "نرد بسرعة" },
        ],
      };
    case "faq":
      return {
        type,
        title: "أسئلة شائعة",
        items: [
          { q: "كيف أدفع؟", a: "الدفع نقداً عند استلام الطلب." },
          { q: "كم يستغرق التوصيل؟", a: "عادةً من يوم إلى 3 أيام حسب المدينة." },
        ],
      };
    case "rich_text":
      return { type, title: "عن متجرنا", text: "اكتب هنا ما تود إخبار زبائنك به." };
  }
}

/** Home page every new store starts with. The merchant can change all of it. */
export function defaultSections(storeName: string): Section[] {
  return [
    { type: "hero", title: storeName, subtitle: "اكتشف منتجاتنا واطلب بسهولة، والدفع عند الاستلام", buttonText: "تصفّح المنتجات" },
    newSection("categories"),
    newSection("featured_products"),
    newSection("whatsapp_cta"),
  ];
}

export const RESERVED_SLUGS = [
  "www", "app", "admin", "api", "dashboard", "mail", "help", "support", "blog", "s",
  "login", "signup", "tamkar", "demo", "lamar", "halawet", "test", "shop", "store",
];

/** Turns a local Syrian number (09xxxxxxxx) or +963... into 963xxxxxxxxx. */
export function normalizeWhatsapp(input: string): string {
  let d = input.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("09") && d.length === 10) d = "963" + d.slice(1);
  if (d.startsWith("9") && d.length === 9) d = "963" + d;
  return d;
}
