/**
 * What each subscription includes. Basic is everything a shop needs to sell;
 * Pro is for shops that grew: a team, branches, more products, ads, invoices.
 * The free trial gets Pro, so merchants try the full thing.
 */
export type PlanId = "trial" | "basic" | "pro";

export const PLAN_LABELS: Record<string, string> = { trial: "تجريبي (كل الميزات)", basic: "أساسي", pro: "احترافي" };

type PlanStore = { plan?: string | null };

export const isPro = (s: PlanStore) => s.plan === "pro" || s.plan === "trial" || !s.plan;

export const LIMITS = {
  basic: { products: 100, staff: 0, branches: 1 },
  pro: { products: Infinity, staff: 3, branches: 5 },
};

export const limits = (s: PlanStore) => (isPro(s) ? LIMITS.pro : LIMITS.basic);

/** Shown on locked features and the upgrade card. */
export const PRO_FEATURES = [
  "منتجات بلا حدود (الأساسي لغاية 100)",
  "لغاية 3 حسابات موظفين",
  "لغاية 5 فروع، كل فرع بواتسابه",
  "فواتير وعروض أسعار PDF بتبعتها للزبون عالواتساب",
  "ربط إعلانات فيسبوك وانستغرام (Pixel والكتالوج)",
  "استيراد وتصدير Excel",
  "تقارير أعمق: أفضل الزبائن ومقارنة الأشهر",
  "بدون جملة \"مبني على المنصة\" بأسفل المتجر",
];
