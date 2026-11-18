import Link from "next/link";

const platform = process.env.NEXT_PUBLIC_PLATFORM_NAME || "TamKar";

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
