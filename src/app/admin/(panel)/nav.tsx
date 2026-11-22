"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin", label: "نظرة عامة" },
  { href: "/admin/stores", label: "المتاجر" },
  { href: "/admin/stores/new", label: "+ متجر جديد" },
  { href: "/admin/test-data", label: "متاجر تجريبية" },
];

export function AdminNav({ horizontal }: { horizontal?: boolean }) {
  const path = usePathname();
  const active = (h: string) => (h === "/admin" ? path === h : h === "/admin/stores" ? path.startsWith(h) && !path.endsWith("/new") : path === h);
  return (
    <nav className={horizontal ? "flex gap-1 overflow-x-auto" : "flex flex-col gap-0.5"}>
      {ITEMS.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[13px] ${active(i.href) ? "bg-white font-semibold shadow-[0_0_0_1px_rgba(0,0,0,0.06)]" : "hover:bg-black/5"}`}
        >
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
