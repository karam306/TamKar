"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { Perm } from "@/lib/permissions";

type Sub = { href: string; label: string; match?: string[] };
type Item = { href: string; label: string; icon: string; sub?: Sub[] };

const subOn = (path: string, s: Sub) =>
  path.startsWith(s.href) || (s.match ?? []).some((m) => path.startsWith(m));

const ICONS = {
  home: "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  orders: "M5 4h14v16l-3-2-2 2-2-2-2 2-2-2-3 2zM9 9h6M9 13h6",
  products: "M4 7l8-4 8 4v10l-8 4-8-4zM4 7l8 4 8-4M12 11v10",
  customers:
    "M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM21 19v-1a4 4 0 0 0-3-3.9M15 4.1a3 3 0 0 1 0 5.8",
  store:
    "M3 9l1.5-5h15L21 9M3 9h18v2a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0zM5 13v7h14v-7",
  analytics: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  marketing:
    "M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13",
  discounts:
    "M9 15l6-6M9.5 9.5h.01M14.5 14.5h.01M4 12l1.5-1.5L5 8.5l2-.5.5-2 2 .5L12 4l2.5 2.5 2-.5.5 2 2 .5-.5 2L20 12l-1.5 1.5.5 2-2 .5-.5 2-2-.5L12 20l-2.5-2.5-2 .5-.5-2-2-.5.5-2z",
  settings:
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7 7 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z",
};

// Kept short on purpose: everyday work only. Technical things (Meta, SEO, Excel,
// menus) live under Settings > Advanced settings.
export const NAV: Item[] = [
  { href: "/dashboard", label: "الرئيسية", icon: ICONS.home },
  {
    href: "/dashboard/orders",
    label: "الطلبات",
    icon: ICONS.orders,
    sub: [
      { href: "/dashboard/orders/new", label: "طلب يدوي جديد" },
      { href: "/dashboard/quotes", label: "عروض الأسعار" },
      { href: "/dashboard/debts", label: "الديون" },
    ],
  },
  {
    href: "/dashboard/products",
    label: "المنتجات",
    icon: ICONS.products,
    sub: [
      { href: "/dashboard/collections", label: "المجموعات" },
      { href: "/dashboard/products/catalog", label: "كتالوج PDF" },
    ],
  },
  { href: "/dashboard/customers", label: "الزبائن", icon: ICONS.customers },
  { href: "/dashboard/discounts", label: "الخصومات", icon: ICONS.discounts },
  { href: "/dashboard/analytics", label: "التقارير", icon: ICONS.analytics },
  {
    href: "/dashboard/design",
    label: "شكل المتجر",
    icon: ICONS.store,
    sub: [{ href: "/dashboard/pages", label: "الصفحات" }],
  },
];

const ADVANCED_PATHS = [
  "/dashboard/marketing",
  "/dashboard/seo",
  "/dashboard/navigation",
  "/dashboard/products/import",
];

export const SETTINGS: Item = {
  href: "/dashboard/settings",
  label: "الإعدادات",
  icon: ICONS.settings,
  sub: [
    { href: "/dashboard/settings/shipping", label: "الاستلام والتوصيل" },
    { href: "/dashboard/settings/currency", label: "سعر الصرف" },
    { href: "/dashboard/settings/branches", label: "الفروع" },
    { href: "/dashboard/settings/team", label: "الموظفين" },
    {
      href: "/dashboard/settings/advanced",
      label: "إعدادات متقدمة",
      match: ADVANCED_PATHS,
    },
  ],
};

function useActive() {
  const path = usePathname();
  return {
    path,
    isActive: (href: string) => {
      // Pages that moved to "Advanced settings" only light up that item.
      if (
        href !== SETTINGS.href &&
        ADVANCED_PATHS.some((m) => path.startsWith(m))
      )
        return false;
      return href === "/dashboard"
        ? path === href
        : path === href || path.startsWith(href + "/");
    },
  };
}

export function Icon({ d, size = 18 }: { d: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={d} />
    </svg>
  );
}

function NavList({
  items,
  onNavigate,
}: {
  items: Item[];
  onNavigate?: () => void;
}) {
  const { path, isActive } = useActive();
  return (
    <ul className="flex flex-col gap-0.5">
      {items.map((i) => {
        const subActive = i.sub?.some((s) => subOn(path, s));
        const active = isActive(i.href) && !subActive;
        const open = isActive(i.href) || subActive;
        return (
          <li key={i.href}>
            <Link
              href={i.href}
              onClick={onNavigate}
              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] ${active ? "bg-white font-semibold shadow-[0_0_0_1px_rgba(0,0,0,0.06)]" : open ? "font-semibold" : "text-[#303030] hover:bg-black/5"}`}
            >
              <span
                className={active || open ? "text-[#303030]" : "text-[#4a4a4a]"}
              >
                <Icon d={i.icon} />
              </span>
              {i.label}
            </Link>
            {open && i.sub && (
              <ul className="mt-0.5 flex flex-col gap-0.5 pr-8">
                {i.sub.map((s) => (
                  <li key={s.href}>
                    <Link
                      href={s.href}
                      onClick={onNavigate}
                      className={`block rounded-lg px-2.5 py-1.5 text-[13px] ${subOn(path, s) ? "bg-white font-semibold shadow-[0_0_0_1px_rgba(0,0,0,0.06)]" : "text-[#4a4a4a] hover:bg-black/5"}`}
                    >
                      {s.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Grey side menu, like Shopify's admin. On phones it slides in from the side. */
/** Staff see only the tabs the owner gave them (see Settings > Staff). */
const TAB_PERM: Record<string, Perm> = {
  "/dashboard/orders": "orders",
  "/dashboard/orders/new": "orders",
  "/dashboard/quotes": "quotes",
  "/dashboard/debts": "orders",
  "/dashboard/products/catalog": "products",
  "/dashboard/products": "products",
  "/dashboard/collections": "products",
  "/dashboard/customers": "customers",
  "/dashboard/discounts": "discounts",
  "/dashboard/analytics": "analytics",
  "/dashboard/design": "design",
  "/dashboard/pages": "design",
};
function navFor(staff?: boolean, perms: Perm[] = []): Item[] {
  if (!staff) return NAV;
  const ok = (href: string) =>
    href === "/dashboard" || perms.includes(TAB_PERM[href]);
  return NAV.flatMap((i) => {
    const sub = i.sub?.filter((x) => ok(x.href));
    if (ok(i.href)) return [{ ...i, sub }];
    // e.g. quotes without orders: show the allowed sub-tab on its own.
    return (sub ?? []).map((x) => ({
      href: x.href,
      label: x.label,
      icon: i.icon,
    }));
  });
}

export function SideNav({
  storeName,
  storeLink,
  staff,
  perms,
}: {
  storeName: string;
  storeLink: string;
  staff?: boolean;
  perms?: Perm[];
}) {
  return (
    <div className="flex h-full flex-col">
      <nav className="flex-1 overflow-y-auto p-3">
        <NavList items={staff ? navFor(true, perms) : [...NAV, SETTINGS]} />
        <div className="mt-5 px-2.5 text-xs font-semibold text-[#616161]">
          المتجر الإلكتروني
        </div>
        <a
          href={storeLink}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 flex items-center justify-between rounded-lg px-2.5 py-1.5 text-[13px] hover:bg-black/5"
        >
          <span className="truncate">{storeName}</span>
          <span aria-hidden>↗</span>
        </a>
      </nav>
    </div>
  );
}

export function MobileMenu({
  storeName,
  storeLink,
  staff,
  perms,
}: {
  storeName: string;
  storeLink: string;
  staff?: boolean;
  perms?: Perm[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg p-1.5 text-white hover:bg-white/10 lg:hidden"
        aria-label="القائمة"
      >
        <Icon d="M4 6h16M4 12h16M4 18h16" size={22} />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="إغلاق القائمة"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 flex w-72 flex-col bg-[#ebebeb] shadow-xl">
            <div className="flex items-center justify-between border-b border-black/5 p-3">
              <span className="font-semibold">{storeName}</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1"
                aria-label="إغلاق"
              >
                ✕
              </button>
            </div>
            <div
              className="flex-1 overflow-y-auto p-3"
              onClick={(e) =>
                (e.target as HTMLElement).closest("a") && setOpen(false)
              }
            >
              <NavList
                items={staff ? navFor(true, perms) : [...NAV, SETTINGS]}
              />
              <a
                href={storeLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 block rounded-lg px-2.5 py-1.5 text-[13px] hover:bg-black/5"
              >
                عرض متجرك ↗
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
