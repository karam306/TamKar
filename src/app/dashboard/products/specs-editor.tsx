"use client";

import { useState } from "react";

/** Specification rows shown as a table on the product page (screen, battery, material...). */
export function SpecsEditor({ initial, presets }: { initial: { name: string; value: string }[]; presets: string[] }) {
  const [rows, setRows] = useState(initial);
  const unused = presets.filter((p) => !rows.some((r) => r.name === p));
  return (
    <section className="card space-y-3 p-4">
      <input type="hidden" name="specs" value={JSON.stringify(rows)} />
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">المواصفات</h2>
        <span className="text-xs text-muted">تظهر كجدول في صفحة المنتج</span>
      </div>
      {rows.length > 0 && (
        <ul className="space-y-2">
          {rows.map((r, i) => (
            <li key={i} className="flex items-center gap-2">
              <input className="input !w-40" placeholder="الاسم" value={r.name} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
              <input className="input flex-1" placeholder="القيمة" value={r.value} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
              <button type="button" className="px-2 text-muted hover:text-red-700" onClick={() => setRows(rows.filter((_, j) => j !== i))} aria-label="حذف">
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-1.5">
        {unused.map((p) => (
          <button key={p} type="button" className="rounded-lg border border-black/10 px-2.5 py-1 text-[13px] hover:bg-[#f7f7f7]" onClick={() => setRows([...rows, { name: p, value: "" }])}>
            + {p}
          </button>
        ))}
        <button type="button" className="rounded-lg border border-dashed border-black/20 px-2.5 py-1 text-[13px]" onClick={() => setRows([...rows, { name: "", value: "" }])}>
          + مواصفة أخرى
        </button>
      </div>
    </section>
  );
}
