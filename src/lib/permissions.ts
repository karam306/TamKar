/** Tabs the store owner can open or close for each staff member (Pro). Settings always stay with the owner. */
export const PERMS = [
  "orders",
  "quotes",
  "products",
  "customers",
  "discounts",
  "analytics",
  "design",
] as const;
export type Perm = (typeof PERMS)[number];

export const PERM_LABELS: Record<
  Perm,
  { label: string; icon: string; hint: string }
> = {
  orders: {
    label: "الطلبات",
    icon: "📦",
    hint: "يشوف الطلبات، يغيّر حالتها، يعمل طلب يدوي، استرجاع وتبديل",
  },
  quotes: {
    label: "عروض الأسعار",
    icon: "📝",
    hint: "يعمل عروض أسعار ويبعتها للزباين",
  },
  products: {
    label: "المنتجات والمخزون",
    icon: "🏷️",
    hint: "يضيف ويعدّل المنتجات والمجموعات والكميات",
  },
  customers: {
    label: "الزباين",
    icon: "👥",
    hint: "يشوف قائمة الزباين وطلباتهم",
  },
  discounts: { label: "الخصومات", icon: "🏷", hint: "يعمل ويعدّل أكواد الخصم" },
  analytics: { label: "التقارير", icon: "📊", hint: "يشوف المبيعات والأرقام" },
  design: {
    label: "شكل المتجر",
    icon: "🎨",
    hint: "يعدّل التصميم والصفحات والقوائم",
  },
};

export const DEFAULT_PERMS: Perm[] = [
  "orders",
  "quotes",
  "products",
  "customers",
];

export const cleanPerms = (v: unknown): Perm[] =>
  Array.isArray(v) ? PERMS.filter((p) => v.includes(p)) : DEFAULT_PERMS;
