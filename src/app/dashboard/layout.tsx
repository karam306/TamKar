import type { Metadata } from "next";
import Link from "next/link";
import { logout } from "@/app/(auth)/actions";
import { requireMerchant } from "@/lib/auth";
import { getPlatformAdmin } from "@/lib/platform-admin";
import { hasSupabase } from "@/lib/supabase";
import { daysLeft, subState } from "@/lib/subscription";
import { storeUrl } from "@/lib/urls";
import { MobileMenu, SideNav } from "./nav";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "لوحة التحكم",
  robots: { index: false },
};
export const dynamic = "force-dynamic";

const platform = BRAND;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!hasSupabase) {
    return (
      <div
        data-theme="admin"
        className="mx-auto max-w-lg p-10 text-center font-sans"
      >
        <h1 className="mb-3 text-2xl">لوحة التحكم غير مفعّلة بعد</h1>
        <p className="text-muted">لازم نربط قاعدة البيانات (Supabase) أول.</p>
      </div>
    );
  }
  const { store, user, role, perms } = await requireMerchant();
  const staff = role === "staff";
  const isOwner = Boolean(await getPlatformAdmin());
  const link = storeUrl(store.slug);
  const initials = store.name.trim().slice(0, 2);

  return (
    <div
      data-theme="admin"
      className="flex min-h-screen flex-col bg-[#1a1a1a] font-sans text-text"
    >
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 px-3 text-white lg:px-4">
        <div className="flex items-center gap-2">
          <MobileMenu
            storeName={store.name}
            storeLink={link}
            staff={staff}
            perms={perms}
          />
          <Link href="/dashboard" className="text-lg font-bold tracking-tight">
            {platform}
          </Link>
        </div>
        <form
          action="/dashboard/products"
          className="hidden max-w-md flex-1 md:block"
        >
          <input
            name="q"
            placeholder="ابحث عن منتج..."
            className="w-full rounded-lg border border-white/10 bg-[#303030] px-3 py-1.5 text-sm text-white placeholder:text-white/50 focus:border-white/40 focus:outline-none"
          />
        </form>
        <details className="relative">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg px-2 py-1 hover:bg-white/10">
            <span className="hidden text-sm sm:inline">{store.name}</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#36fba1] text-xs font-bold text-black">
              {initials}
            </span>
          </summary>
          <div className="card absolute left-0 z-40 mt-2 w-60 p-2 text-sm text-text">
            <div className="truncate px-2 py-1.5 text-muted" dir="ltr">
              {user.email}
            </div>
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg px-2 py-1.5 hover:bg-surface"
            >
              شوف متجرك ↗
            </a>
            {!staff && (
              <Link
                href="/dashboard/settings"
                className="block rounded-lg px-2 py-1.5 hover:bg-surface"
              >
                الإعدادات
              </Link>
            )}
            {isOwner && (
              <Link
                href="/admin"
                className="block rounded-lg px-2 py-1.5 font-semibold hover:bg-surface"
              >
                لوحة المنصة ←
              </Link>
            )}
            <form action={logout}>
              <button
                type="submit"
                className="w-full rounded-lg px-2 py-1.5 text-right hover:bg-surface"
              >
                تسجيل الخروج
              </button>
            </form>
          </div>
        </details>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden lg:rounded-t-xl">
        <aside className="hidden w-60 shrink-0 bg-[#ebebeb] lg:block">
          <div className="sticky top-0 h-[calc(100vh-56px)]">
            <SideNav
              storeName={store.name}
              storeLink={link}
              staff={staff}
              perms={perms}
            />
          </div>
        </aside>
        <div className="min-w-0 flex-1 bg-[#f1f1f1]">
          <SubscriptionBanner
            status={store.status}
            plan={store.plan}
            paidUntil={store.paid_until}
          />
          <main className="mx-auto max-w-[1000px] px-4 py-6 lg:px-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

const SUPPORT = process.env.PLATFORM_SUPPORT_WHATSAPP;

function SubscriptionBanner({
  status,
  plan,
  paidUntil,
}: {
  status: string;
  plan?: string | null;
  paidUntil?: string | null;
}) {
  const state = subState({ status, plan, paid_until: paidUntil });
  const left = daysLeft(paidUntil);
  const msg: Partial<Record<typeof state, string>> = {
    suspended: "متجرك متوقف حالياً وما حدا بيقدر يشوفه.",
    expired: "اشتراكك خلص ومتجرك متوقف عن الزبائن.",
    grace: "اشتراكك خلص. المتجر رح يتوقف خلال أيام إذا ما تجدد.",
    expiring: `اشتراكك بيخلص بعد ${left} يوم.`,
    trial:
      left != null
        ? `أنت بالفترة التجريبية، باقي ${Math.max(0, left)} يوم.`
        : "",
  };
  const text = msg[state];
  if (!text) return null;
  const red = ["suspended", "expired", "grace"].includes(state);
  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-3 px-4 py-2 text-center text-[13px] ${red ? "bg-[#c70a24] text-white" : "bg-[#ffeb78] text-[#4f4700]"}`}
    >
      <span>{text}</span>
      {SUPPORT && (
        <a
          href={`https://wa.me/${SUPPORT}?text=${encodeURIComponent("مرحبا، بدي جدد اشتراك متجري")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold underline"
        >
          جدّد الاشتراك
        </a>
      )}
    </div>
  );
}
