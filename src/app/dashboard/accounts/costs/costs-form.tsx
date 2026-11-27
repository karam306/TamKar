"use client";

import { useActionState, useState } from "react";
import { FormMessage, SubmitButton } from "@/components/form-ui";
import { saveCosts } from "../actions";

export type CostRow = {
  id: string;
  title: string;
  price: number;
  cost: number | null;
  variants: { title: string; price: number; cost: number | null }[];
};

const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });

/** One table for every product's cost price; the margin updates as you type. */
export function CostsForm({ rows, unit }: { rows: CostRow[]; unit: string }) {
  const [state, action] = useActionState(saveCosts, undefined);
  return (
    <form action={action} className="space-y-3">
      <ul className="divide-y divide-black/10 rounded-lg border border-black/10 text-[13px]">
        <li className="hidden grid-cols-[1fr_110px_130px_90px] gap-2 bg-[#f7f7f7] px-3 py-2 text-xs text-muted sm:grid">
          <span>المنتج</span>
          <span>سعر البيع</span>
          <span>سعر التكلفة ({unit})</span>
          <span>الربح</span>
        </li>
        {rows.map((p) => (
          <li key={p.id} className="px-3 py-2">
            <Line name={`c:${p.id}`} title={p.title} price={p.price} cost={p.cost} bold placeholder={p.variants.length ? "لكل الخيارات" : ""} />
            {p.variants.map((v) => (
              <Line key={v.title} name={`v:${p.id}:${v.title}`} title={`↳ ${v.title}`} price={v.price} cost={v.cost} fallback={p.cost} placeholder="كالمنتج" />
            ))}
          </li>
        ))}
      </ul>
      <div className="sticky bottom-0 space-y-2 bg-[#f1f1f1] py-3">
        <FormMessage state={state} />
        <SubmitButton>احفظ أسعار التكلفة</SubmitButton>
      </div>
    </form>
  );
}

function Line({
  name,
  title,
  price,
  cost,
  fallback,
  bold,
  placeholder,
}: {
  name: string;
  title: string;
  price: number;
  cost: number | null;
  fallback?: number | null;
  bold?: boolean;
  placeholder?: string;
}) {
  const [text, setText] = useState(cost != null ? String(cost) : "");
  const c = text.trim() === "" ? fallback ?? null : Number(text);
  const profit = c == null || !Number.isFinite(c) ? null : price - c;
  return (
    <div className="grid grid-cols-[1fr_1fr] items-center gap-x-2 gap-y-1 py-1 sm:grid-cols-[1fr_110px_130px_90px]">
      <span className={`col-span-2 truncate sm:col-span-1 ${bold ? "font-semibold" : "pr-3 text-muted"}`}>{title}</span>
      <span className="text-muted" dir="ltr" style={{ textAlign: "right" }}>
        <span className="sm:hidden">البيع: </span>
        {fmt(price)}
      </span>
      <input name={name} value={text} onChange={(e) => setText(e.target.value)} inputMode="decimal" className="input !py-1.5" dir="ltr" placeholder={placeholder} aria-label={`سعر تكلفة ${title}`} />
      <span className={`col-span-2 text-xs sm:col-span-1 ${profit == null ? "text-muted" : profit >= 0 ? "text-[#1a7f37]" : "text-red-700"}`}>
        {profit == null ? "" : `${fmt(profit)}${price > 0 ? ` (${Math.round((profit / price) * 100)}٪)` : ""}`}
      </span>
    </div>
  );
}
