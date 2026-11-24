import type { Metadata } from "next";
import Link from "next/link";
import { adminLogout } from "@/app/admin/login/actions";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { AdminNav } from "./nav";
import { KunLogo } from "@/components/kun-logo";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = { title: "لوحة المنصة", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { email } = await requirePlatformAdmin();
  return (
    <div data-theme="admin" data-ui className="flex min-h-screen flex-col bg-[#0b2b26] font-sans text-text">
      <header className="flex h-14 items-center justify-between gap-3 px-4 text-white">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-[1.6rem]" aria-label="لوحة المنصة">
            <KunLogo lang="en" onDark />
          </Link>
          <span className="rounded-md bg-white/15 px-2 py-0.5 text-xs">لوحة المنصة</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <ThemeToggle onDark />
          <span className="hidden opacity-80 sm:inline" dir="ltr">
            {email}
          </span>
          <form action={adminLogout}>
            <button className="opacity-80 hover:opacity-100">خروج</button>
          </form>
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden lg:rounded-t-xl">
        <aside className="hidden w-56 shrink-0 bg-[#ebebeb] p-3 lg:block">
          <AdminNav />
        </aside>
        <div className="min-w-0 flex-1 bg-[#f1f1f1]">
          <div className="border-b border-black/5 bg-white p-2 lg:hidden">
            <AdminNav horizontal />
          </div>
          <main className="mx-auto max-w-[1100px] px-4 py-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
