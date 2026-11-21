import Link from "next/link";
import { BRAND } from "@/lib/brand";

const platform = BRAND;

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-theme="classic" className="flex min-h-screen flex-col items-center bg-surface px-4 py-10 font-sans">
      <Link href="/" className="mb-8 text-3xl font-bold text-primary">
        {platform}
      </Link>
      <div className="w-full max-w-md rounded-theme bg-white p-6 shadow-sm sm:p-8">{children}</div>
    </div>
  );
}
