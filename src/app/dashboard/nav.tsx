"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/dashboard", label: "الرئيسية" },
  { href: "/dashboard/orders", label: "الطلبات" },
  { href: "/dashboard/products", label: "المنتجات" },
  { href: "/dashboard/design", label: "تصميم المتجر" },
  { href: "/dashboard/settings", label: "الإعدادات" },
];

export function DashNav() {
  const path = usePathname();
  return (
    <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2 text-sm">
      {items.map((i) => {
        const active = i.href === "/dashboard" ? path === i.href : path.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            className={`whitespace-nowrap border-b-2 px-3 py-3 ${active ? "border-primary font-semibold text-primary" : "border-transparent text-muted hover:text-text"}`}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
