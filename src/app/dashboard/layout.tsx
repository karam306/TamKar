import type { Metadata } from "next";
import Link from "next/link";
import { logout } from "@/app/(auth)/actions";
import { requireMerchant } from "@/lib/auth";
import { hasSupabase } from "@/lib/supabase";
import { storeUrl } from "@/lib/urls";
import { BottomNav, SideNav } from "./nav";

export const metadata: Metadata = { title: "لوحة التحكم", robots: { index: false } };
export const dynamic = "force-dynamic";

const platform = process.env.NEXT_PUBLIC_PLATFORM_NAME || "TamKar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  if (!hasSupabase) {
    return (
      <div data-theme="classic" className="mx-auto max-w-lg p-10 text-center font-sans">
        <h1 className="mb-3 text-2xl">لوحة التحكم غير مفعّلة بعد</h1>
        <p className="text-muted">لازم نربط قاعدة البيانات (Supabase) أول.</p>
      </div>
    );
  }
  const { store, user } = await requireMerchant();

  return (
    <div data-theme="classic" className="min-h-screen bg-surface font-sans lg:flex">
      {/* Side menu (computers) */}
      <aside className="hidden w-64 shrink-0 flex-col border-l border-black/5 bg-white lg:sticky lg:top-0 lg:flex lg:h-screen">
        <div className="border-b border-black/5 p-5">
          <Link href="/dashboard" className="text-2xl font-bold text-primary">
            {platform}
          </Link>
          <div className="mt-1 truncate text-sm text-muted">{store.name}</div>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <SideNav />
        </div>
        <div className="space-y-2 border-t border-black/5 p-3">
          <a href={storeUrl(store.slug)} target="_blank" rel="noopener noreferrer" className="btn btn-outline w-full !py-2 text-sm">
            شوف متجرك ↗
          </a>
          <div className="flex items-center justify-between px-1 text-xs text-muted">
            <span className="truncate" dir="ltr">
              {user.email}
            </span>
            <form action={logout}>
              <button type="submit" className="hover:text-text">
                خروج
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Top bar (phones) */}
        <header className="flex h-14 items-center justify-between border-b border-black/5 bg-white px-4 lg:hidden">
          <Link href="/dashboard" className="text-xl font-bold text-primary">
            {platform}
          </Link>
          <div className="flex items-center gap-2 text-sm">
            <a href={storeUrl(store.slug)} target="_blank" rel="noopener noreferrer" className="btn btn-outline !px-3 !py-1.5 text-sm">
              متجرك ↗
            </a>
            <form action={logout}>
              <button type="submit" className="px-2 text-muted">
                خروج
              </button>
            </form>
          </div>
        </header>

        {store.status === "suspended" && (
          <div className="bg-red-600 px-4 py-2 text-center text-sm text-white">
            متجرك متوقف حالياً وما حدا بيقدر يشوفه. تواصل معنا لتجديد الاشتراك.
          </div>
        )}
        <main className="mx-auto max-w-5xl px-4 py-6 pb-24 lg:px-8 lg:pb-8">{children}</main>
      </div>

      <BottomNav />
    </div>
  );
}
