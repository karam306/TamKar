import Link from "next/link";
import { monthBounds, monthLabel, todayDamascus } from "@/lib/accounts";

const TABS = [
  { href: "/dashboard/accounts", label: "الربح الشهري" },
  { href: "/dashboard/accounts/expenses", label: "المصاريف" },
  { href: "/dashboard/accounts/cash", label: "الصندوق" },
  { href: "/dashboard/accounts/suppliers", label: "الموردون" },
  { href: "/dashboard/accounts/purchases", label: "المشتريات" },
  { href: "/dashboard/accounts/costs", label: "أسعار التكلفة" },
];

/** The tab row at the top of every "Accounts" page. */
export function AccountsTabs({ active }: { active: string }) {
  return (
    <nav className="-mx-1 mb-4 flex gap-1 overflow-x-auto pb-1 text-[13px]" aria-label="أقسام الحسابات">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={`shrink-0 rounded-lg px-3 py-1.5 ${t.href === active ? "bg-white font-semibold shadow-[0_0_0_1px_rgba(0,0,0,0.08)]" : "text-[#4a4a4a] hover:bg-black/5"}`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

/** ‹ previous month · this month · next month › */
export function MonthNav({ month, path, extra = "" }: { month: string; path: string; extra?: string }) {
  const b = monthBounds(month);
  const now = todayDamascus().slice(0, 7);
  return (
    <div className="flex items-center gap-1 text-[13px]">
      <Link href={`${path}?m=${b.prev}${extra}`} className="btn btn-outline !px-2.5" aria-label="الشهر السابق">
        →
      </Link>
      <span className="min-w-28 text-center font-semibold">{monthLabel(month)}</span>
      {b.next <= now ? (
        <Link href={`${path}?m=${b.next}${extra}`} className="btn btn-outline !px-2.5" aria-label="الشهر التالي">
          ←
        </Link>
      ) : (
        <span className="btn btn-outline pointer-events-none !px-2.5 opacity-40">←</span>
      )}
    </div>
  );
}

export function Need018() {
  return (
    <section className="card space-y-2 p-4 text-[13px]">
      <h2 className="font-semibold">الحسابات بحاجة إلى تحديث قاعدة البيانات</h2>
      <p className="text-muted">شغّل الملف 018_accounts.sql مرة واحدة في Supabase: SQL Editor ← New query ← الصق ← Run.</p>
    </section>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: React.ReactNode; tone?: "good" | "bad" }) {
  return (
    <div className="card p-4">
      <div className="text-[13px] text-muted">{label}</div>
      <div className={`mt-1 text-xl font-bold ${tone === "good" ? "text-[#1a7f37]" : tone === "bad" ? "text-red-700" : ""}`} dir="ltr" style={{ textAlign: "right" }}>
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </div>
  );
}
