import type { Metadata } from "next";
import Link from "next/link";
import { logout } from "@/app/(auth)/actions";
import { requireMerchant } from "@/lib/auth";
import { hasSupabase } from "@/lib/supabase";
import { storeUrl } from "@/lib/urls";
import { DashNav } from "./nav";

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
  const { store } = await requireMerchant();

  return (
    <div data-theme="classic" className="min-h-screen bg-surface font-sans">
      <header className="border-b border-black/5 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-xl font-bold text-primary">
              {platform}
            </Link>
            <span className="hidden text-sm text-muted sm:inline">/ {store.name}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <a href={storeUrl(store.slug)} target="_blank" rel="noopener noreferrer" className="btn btn-outline !px-3 !py-1.5 text-sm">
              شوف متجرك ↗
            </a>
            <form action={logout}>
              <button type="submit" className="px-2 py-1.5 text-muted hover:text-text">
                خروج
              </button>
            </form>
          </div>
        </div>
        <DashNav />
      </header>
      {store.status === "suspended" && (
        <div className="bg-red-600 px-4 py-2 text-center text-sm text-white">
          متجرك متوقف حالياً وما حدا بيقدر يشوفه. تواصل معنا لتجديد الاشتراك.
        </div>
      )}
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
