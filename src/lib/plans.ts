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
  "منتجات غير محدودة (الأساسية حتى 100)",
  "حتى 3 حسابات للموظفين بصلاحيات محددة",
  "حتى 5 فروع، لكل فرع رقم واتساب خاص",
  "فواتير وعروض أسعار PDF ترسلها إلى الزبون عبر واتساب",
  "ربط إعلانات فيسبوك وإنستغرام (Pixel والكتالوج)",
  "استيراد وتصدير Excel",
  "تقارير مفصّلة: أفضل الزبائن ومقارنة الأشهر",
  "دون عبارة \"مبني على المنصة\" أسفل المتجر",
];
