/** Kinds of shops a merchant can pick. Templates per type come later; for now this labels the store. */
export const BUSINESS_TYPES = [
  { id: "clothing", label: "ملابس وأحذية" },
  { id: "accessories", label: "إكسسوارات ومجوهرات" },
  { id: "phones", label: "موبايلات وإلكترونيات" },
  { id: "computers", label: "كمبيوتر ولابتوبات وقطع" },
  { id: "food", label: "مطاعم وحلويات" },
  { id: "beauty", label: "عطور وتجميل" },
  { id: "home", label: "أدوات منزلية ومطبخ" },
  { id: "general", label: "عام / أخرى" },
] as const;

export type BusinessType = (typeof BUSINESS_TYPES)[number]["id"];

export const businessLabel = (id?: string | null) => BUSINESS_TYPES.find((b) => b.id === id)?.label ?? "عام / أخرى";
