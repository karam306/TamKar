/** Days a store stays open after its subscription date passes. */
export const GRACE_DAYS = 3;
export const TRIAL_DAYS = 14;

export type SubState = "active" | "trial" | "expiring" | "grace" | "expired" | "suspended";

const today = () => new Date(new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Damascus" }) + "T00:00:00Z");

export function daysLeft(paidUntil?: string | null): number | null {
  if (!paidUntil) return null;
  return Math.round((new Date(paidUntil + "T00:00:00Z").getTime() - today().getTime()) / 86400000);
}

export function subState(s: { status: string; plan?: string | null; paid_until?: string | null }): SubState {
  if (s.status === "suspended") return "suspended";
  const left = daysLeft(s.paid_until);
  if (left === null) return s.plan === "trial" ? "trial" : "active";
  if (left < -GRACE_DAYS) return "expired";
  if (left < 0) return "grace";
  if (s.plan === "trial") return "trial";
  if (left <= 5) return "expiring";
  return "active";
}

/** Shoppers can still open the store? */
export const isOpen = (s: { status: string; plan?: string | null; paid_until?: string | null }) => !["expired", "suspended"].includes(subState(s));

export const SUB_LABELS: Record<SubState, { label: string; className: string }> = {
  active: { label: "فعّال", className: "bg-[#affebf] text-[#014b40]" },
  trial: { label: "تجريبي", className: "bg-[#e0f0ff] text-[#00527c]" },
  expiring: { label: "قرب يخلص", className: "bg-[#ffeb78] text-[#4f4700]" },
  grace: { label: "خلص (مهلة)", className: "bg-[#ffd6a4] text-[#5e4200]" },
  expired: { label: "منتهي", className: "bg-[#fedad9] text-[#8e0b21]" },
  suspended: { label: "موقوف", className: "bg-[#e3e3e3] text-[#616161]" },
};

/** New paid-until date after paying for some months (counts from today if already expired). */
export function extendDate(paidUntil: string | null | undefined, months: number): string {
  const base = paidUntil && (daysLeft(paidUntil) ?? -1) >= 0 ? new Date(paidUntil + "T00:00:00Z") : today();
  const d = new Date(base);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

export function trialEnd(): string {
  const d = today();
  d.setUTCDate(d.getUTCDate() + TRIAL_DAYS);
  return d.toISOString().slice(0, 10);
}
