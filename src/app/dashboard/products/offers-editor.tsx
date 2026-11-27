"use client";

import { useState } from "react";
import type { QtyOffer } from "@/lib/offers";

/** Quantity offers for one product: from N pieces, X% off each piece. */
export function OffersEditor({ initial }: { initial: QtyOffer[] }) {
  const [rows, setRows] = useState<{ min: string; off: string }[]>(
    initial.map((t) => ({ min: String(t.min), off: String(t.off) })),
  );
  const set = (i: number, patch: Partial<{ min: string; off: string }>) =>
    setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  return (
    <section className="card space-y-3 p-4">
      <input type="hidden" name="qty_prices" value={JSON.stringify(rows.map((r) => ({ min: Number(r.min), off: Number(r.off) })))} />
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">عروض الكمية</h2>
        <span className="text-xs text-muted">تشجّع الزبون على شراء قطع أكثر</span>
      </div>
      {rows.length === 0 && (
        <p className="text-[13px] text-muted">مثال: ٣ قطع فأكثر بخصم ١٠٪ على كل قطعة. تُحسب كل خيارات المنتج معاً.</p>
      )}
      {rows.map((r, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2 text-[13px]">
          <span>من</span>
          <input className="input !w-20" dir="ltr" inputMode="numeric" value={r.min} onChange={(e) => set(i, { min: e.target.value })} placeholder="3" />
          <span>قطع فأكثر، خصم</span>
          <input className="input !w-20" dir="ltr" inputMode="decimal" value={r.off} onChange={(e) => set(i, { off: e.target.value })} placeholder="10" />
          <span>٪ على كل قطعة</span>
          <button type="button" className="px-2 text-muted hover:text-red-700" onClick={() => setRows(rows.filter((_, j) => j !== i))} aria-label="حذف">
            ✕
          </button>
        </div>
      ))}
      {rows.length < 5 && (
        <button
          type="button"
          className="text-[13px] font-semibold text-[#005bd3] hover:underline"
          onClick={() => setRows([...rows, { min: String((Number(rows.at(-1)?.min) || 1) + 2), off: "" }])}
        >
          + إضافة عرض كمية
        </button>
      )}
    </section>
  );
}
