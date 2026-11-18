import type { Section, SectionType, ThemeId } from "./types";

export const THEMES: { id: ThemeId; name: string; description: string; color: string }[] = [
  { id: "classic", name: "الكلاسيكي", description: "هادئ ومرتب، بيناسب أغلب المتاجر", color: "#0f5c4d" },
  { id: "bold", name: "الجريء", description: "خط عريض وزوايا حادة، للأزياء والإلكترونيات", color: "#c2185b" },
  { id: "soft", name: "الناعم", description: "ألوان دافئة وزوايا مدورة، للحلويات والهدايا", color: "#8d5a2b" },
];

export const SECTION_LABELS: Record<SectionType, string> = {
  announcement: "شريط إعلان",
  hero: "البانر الرئيسي",
  categories: "التصنيفات",
  featured_products: "المنتجات",
  image_text: "صورة ونص",
  testimonials: "آراء الزبائن",
  whatsapp_cta: "زر واتساب",
};

export function newSection(type: SectionType): Section {
  switch (type) {
    case "announcement":
      return { type, text: "توصيل لكل المحافظات" };
    case "hero":
      return { type, title: "أهلاً بكم بمتجرنا", subtitle: "اكتشف منتجاتنا واطلب بكل سهولة", buttonText: "شوف المنتجات" };
    case "categories":
      return { type, title: "تصفح حسب القسم" };
    case "featured_products":
      return { type, title: "منتجاتنا", limit: 8 };
    case "image_text":
      return { type, title: "مين نحنا", text: "احكي لزبائنك قصة متجرك وشو بيميزك." };
    case "testimonials":
      return { type, title: "شو قالوا زباينا", items: [{ name: "زبون", text: "تجربة ممتازة وتوصيل سريع" }] };
    case "whatsapp_cta":
      return { type, title: "عندك سؤال؟", text: "احكينا على واتساب ومنرد عليك بسرعة" };
  }
}

/** Home page every new store starts with. The merchant can change all of it. */
export function defaultSections(storeName: string): Section[] {
  return [
    { type: "hero", title: storeName, subtitle: "اكتشف منتجاتنا واطلب بكل سهولة، والدفع عند الاستلام", buttonText: "شوف المنتجات" },
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
