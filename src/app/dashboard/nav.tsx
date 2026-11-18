"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/dashboard", label: "الرئيسية", icon: "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" },
  { href: "/dashboard/orders", label: "الطلبات", icon: "M6 7h12l-1 13H7L6 7zM9 7a3 3 0 0 1 6 0" },
  { href: "/dashboard/products", label: "المنتجات", icon: "M4 7l8-4 8 4v10l-8 4-8-4zM4 7l8 4 8-4M12 11v10" },
  { href: "/dashboard/design", label: "تصميم المتجر", icon: "M12 3a9 9 0 1 0 0 18c1 0 1.5-.8 1.5-1.5S13 18 13 17s.7-1.5 1.5-1.5H17a4 4 0 0 0 4-4C21 7 17 3 12 3zM7.5 12a1 1 0 1 0 0-.01M10 8a1 1 0 1 0 0-.01M15 8a1 1 0 1 0 0-.01" },
  { href: "/dashboard/settings", label: "الإعدادات", icon: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" },
];

function useActive() {
  const path = usePathname();
  return (href: string) => (href === "/dashboard" ? path === href : path.startsWith(href));
}

function Icon({ d }: { d: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

/** Side menu on computers. */
export function SideNav() {
  const isActive = useActive();
  return (
    <nav className="flex flex-col gap-1">
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          className={`flex items-center gap-3 rounded-theme px-3 py-2.5 text-sm ${isActive(i.href) ? "bg-primary font-semibold text-white" : "text-text hover:bg-surface"}`}
        >
          <Icon d={i.icon} />
          {i.label}
        </Link>
      ))}
    </nav>
  );
}

/** Bottom bar on phones. */
export function BottomNav() {
  const isActive = useActive();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-black/10 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
      {items.map((i) => (
        <Link key={i.href} href={i.href} className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${isActive(i.href) ? "text-primary" : "text-muted"}`}>
          <Icon d={i.icon} />
          {i.label.replace("تصميم المتجر", "التصميم")}
        </Link>
      ))}
    </nav>
  );
}
