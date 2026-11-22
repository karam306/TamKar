import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { adminSessionInfo } from "@/lib/platform-admin";
import { BRAND } from "@/lib/brand";
import { switchToAdmin } from "./actions";
import { AdminLoginForm } from "./form";

export const metadata: Metadata = { title: "دخول لوحة المنصة", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const { email, isAdmin } = await adminSessionInfo();
  if (isAdmin) redirect("/admin");

  return (
    <div data-theme="admin" className="flex min-h-screen flex-col items-center justify-center bg-[#0b2b26] px-4 py-10 font-sans">
      <div className="mb-6 text-center text-white">
        <div className="text-3xl font-bold">{BRAND}</div>
        <div className="mt-1 text-sm opacity-75">لوحة المنصة</div>
      </div>
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg sm:p-8">
        {email ? (
          <div className="flex flex-col gap-4 text-center">
            <h1 className="text-xl font-bold">أنت داخل بحساب تاجر</h1>
            <p className="text-sm text-muted">
              داخل حالياً بـ{" "}
              <span dir="ltr" className="font-semibold text-text">
                {email}
              </span>
              . اطلع منه لتدخل على لوحة المنصة.
            </p>
            <form action={switchToAdmin}>
              <button className="btn w-full">اطلع وادخل كمدير</button>
            </form>
            <a href="/dashboard" className="text-sm text-primary">
              ارجع للوحة المتجر
            </a>
          </div>
        ) : (
          <AdminLoginForm />
        )}
      </div>
    </div>
  );
}
