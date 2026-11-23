import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { ThemeToggle } from "@/components/theme-toggle";

const platform = BRAND;

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-theme="classic" data-ui className="relative flex min-h-screen flex-col items-center bg-surface px-4 py-10 font-sans">
      <div className="absolute left-4 top-4">
        <ThemeToggle />
      </div>
      <Link href="/" className="brand-display mb-8 text-4xl text-[#16241A]">
        <span className="hl hl-apricot">{platform}</span>
      </Link>
      <div className="w-full max-w-md rounded-theme bg-white p-6 shadow-sm sm:p-8">{children}</div>
    </div>
  );
}
