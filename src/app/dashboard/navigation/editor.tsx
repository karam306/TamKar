"use client";

import { useActionState, useState } from "react";
import { FormMessage, SubmitButton } from "@/components/form-ui";
import type { MenuLink, StoreMenus } from "@/lib/types";
import { saveMenus } from "./actions";

type Target = { label: string; href: string };

export function MenuEditor({ initial, targets }: { initial: StoreMenus; targets: Target[] }) {
  const [state, action] = useActionState(saveMenus, undefined);
  const [header, setHeader] = useState<MenuLink[]>(initial.header ?? []);
  const [footer, setFooter] = useState<MenuLink[]>(initial.footer ?? []);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="menus" value={JSON.stringify({ header, footer })} />
      <MenuList title="القائمة العلوية" hint="بتظهر فوق بكل صفحات المتجر، وبقائمة ☰ على الموبايل" links={header} setLinks={setHeader} targets={targets} />
      <MenuList title="قائمة الأسفل" hint="بتظهر بأسفل المتجر، مناسبة للصفحات (من نحن، سياسة الإرجاع...)" links={footer} setLinks={setFooter} targets={targets} />
      <FormMessage state={state} />
      <SubmitButton>احفظ القوائم</SubmitButton>
    </form>
  );
}

function MenuList({ title, hint, links, setLinks, targets }: { title: string; hint: string; links: MenuLink[]; setLinks: (l: MenuLink[]) => void; targets: Target[] }) {
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= links.length) return;
    const n = [...links];
    [n[i], n[j]] = [n[j], n[i]];
    setLinks(n);
  };
  return (
    <section className="card space-y-3 p-4">
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-xs text-muted">{hint}</p>
      </div>
      <ul className="space-y-2">
        {links.map((l, i) => {
          const known = targets.some((t) => t.href === l.href);
          return (
            <li key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-black/10 p-2">
              <input className="input !w-40" placeholder="الاسم" value={l.label} onChange={(e) => setLinks(links.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
              <select
                className="input !w-56"
                value={known ? l.href : "custom"}
                onChange={(e) => {
                  const t = targets.find((x) => x.href === e.target.value);
                  setLinks(links.map((x, j) => (j === i ? { label: x.label || t?.label.replace(/^(مجموعة|صفحة): /, "") || "", href: t ? t.href : "https://" } : x)));
                }}
              >
                {targets.map((t) => (
                  <option key={t.href} value={t.href}>
                    {t.label}
                  </option>
                ))}
                <option value="custom">رابط خارجي...</option>
              </select>
              {!known && (
                <input className="input flex-1" dir="ltr" value={l.href} onChange={(e) => setLinks(links.map((x, j) => (j === i ? { ...x, href: e.target.value } : x)))} />
              )}
              <span className="mr-auto flex">
                <button type="button" className="h-8 w-8 rounded hover:bg-[#f7f7f7]" onClick={() => move(i, -1)} aria-label="لفوق">
                  ↑
                </button>
                <button type="button" className="h-8 w-8 rounded hover:bg-[#f7f7f7]" onClick={() => move(i, 1)} aria-label="لتحت">
                  ↓
                </button>
                <button type="button" className="h-8 w-8 rounded text-muted hover:bg-[#f7f7f7]" onClick={() => setLinks(links.filter((_, j) => j !== i))} aria-label="احذف">
                  ✕
                </button>
              </span>
            </li>
          );
        })}
      </ul>
      {links.length < 12 && (
        <button type="button" className="text-[13px] font-semibold text-[#005bd3] hover:underline" onClick={() => setLinks([...links, { label: "", href: "/products" }])}>
          + أضف رابط
        </button>
      )}
    </section>
  );
}
