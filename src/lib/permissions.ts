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
    hint: "عرض الطلبات وتغيير حالتها، وإنشاء الطلبات اليدوية، والاسترجاع والتبديل",
  },
  quotes: {
    label: "عروض الأسعار",
    icon: "📝",
    hint: "إنشاء عروض الأسعار وإرسالها إلى الزبائن",
  },
  products: {
    label: "المنتجات والمخزون",
    icon: "🏷️",
    hint: "إضافة المنتجات والمجموعات وتعديلها وإدارة الكميات",
  },
  customers: {
    label: "الزبائن",
    icon: "👥",
    hint: "عرض قائمة الزبائن وطلباتهم",
  },
  discounts: { label: "الخصومات", icon: "🏷", hint: "إنشاء رموز الخصم وتعديلها" },
  analytics: { label: "التقارير", icon: "📊", hint: "عرض المبيعات والإحصاءات" },
  design: {
    label: "شكل المتجر",
    icon: "🎨",
    hint: "تعديل التصميم والصفحات والقوائم",
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
