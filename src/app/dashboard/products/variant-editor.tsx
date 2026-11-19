"use client";

import { useState } from "react";
import { combinations } from "@/lib/product-utils";
import type { ProductOption, Variant } from "@/lib/types";

type Row = Omit<Variant, "price" | "stock" | "compare_at_price"> & { price: string; stock: string; compare_at_price: string };


/** Options (size, colour...) and one row per combination with its own price and stock. */
export function VariantEditor({
  initialOptions,
  initialVariants,
  basePrice,
  presets,
}: {
  initialOptions: ProductOption[];
  initialVariants: Variant[];
  basePrice: string;
  presets: string[];
}) {
  const PRESETS = [...new Set([...presets, "اللون", "الحجم"])];
  const [options, setOptions] = useState<ProductOption[]>(initialOptions);
  const [rows, setRows] = useState<Row[]>(
    initialVariants.map((v) => ({
      ...v,
      price: String(v.price ?? ""),
      stock: v.stock == null ? "" : String(v.stock),
      compare_at_price: v.compare_at_price == null ? "" : String(v.compare_at_price),
    })),
  );
  const [drafts, setDrafts] = useState<string[]>(initialOptions.map(() => ""));

  // Rebuild rows from options, keeping what was already typed for each combination.
  function sync(next: ProductOption[]) {
    setOptions(next);
    const valid = next.filter((o) => o.name && o.values.length);
    const combos = valid.length ? combinations(valid) : [];
    setRows((cur) =>
      combos.map((combo) => {
        const key = combo.join("|");
        const found = cur.find((r) => r.options.join("|") === key) ?? cur.find((r) => combo.slice(0, r.options.length).join("|") === r.options.join("|"));
        return {
          id: cur.find((r) => r.options.join("|") === key)?.id ?? "",
          title: combo.join(" / "),
          options: combo,
          price: found?.price ?? basePrice,
          stock: found?.stock ?? "",
          compare_at_price: found?.compare_at_price ?? "",
          sku: found?.sku ?? "",
        };
      }),
    );
  }

  const addValue = (oi: number) => {
    const val = drafts[oi].trim();
    if (!val || options[oi].values.includes(val)) return;
    sync(options.map((o, i) => (i === oi ? { ...o, values: [...o.values, val] } : o)));
    setDrafts((d) => d.map((x, i) => (i === oi ? "" : x)));
  };
  const setRow = (i: number, patch: Partial<Row>) => setRows((cur) => cur.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const fillAll = (field: "price" | "stock", value: string) => setRows((cur) => cur.map((r) => ({ ...r, [field]: value })));

  return (
    <div className="space-y-3">
      <input type="hidden" name="options" value={JSON.stringify(options)} />
      <input
        type="hidden"
        name="variants"
        value={JSON.stringify(rows.map((r) => ({ ...r, id: r.id || undefined })))}
      />

      {options.map((o, oi) => (
        <div key={oi} className="space-y-2 rounded-lg border border-black/10 p-3">
          <div className="flex items-center gap-2">
            <input
              className="input"
              list="option-presets"
              placeholder="اسم الخيار (مثلاً: المقاس)"
              value={o.name}
              onChange={(e) => sync(options.map((x, i) => (i === oi ? { ...x, name: e.target.value } : x)))}
            />
            <button
              type="button"
              className="btn btn-outline !text-red-700"
              onClick={() => {
                sync(options.filter((_, i) => i !== oi));
                setDrafts((d) => d.filter((_, i) => i !== oi));
              }}
            >
              حذف
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {o.values.map((val) => (
              <span key={val} className="badge bg-[#e3e3e3] text-[13px]">
                {val}
                <button type="button" aria-label={`احذف ${val}`} onClick={() => sync(options.map((x, i) => (i === oi ? { ...x, values: x.values.filter((v) => v !== val) } : x)))}>
                  ✕
                </button>
              </span>
            ))}
            <input
              className="input !w-40 !py-1"
              placeholder="أضف قيمة واضغط Enter"
              value={drafts[oi] ?? ""}
              onChange={(e) => setDrafts((d) => d.map((x, i) => (i === oi ? e.target.value : x)))}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addValue(oi);
                }
              }}
              onBlur={() => addValue(oi)}
            />
          </div>
        </div>
      ))}
      <datalist id="option-presets">
        {PRESETS.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>

      {options.length < 3 && (
        <button
          type="button"
          className="text-[13px] font-semibold text-[#005bd3] hover:underline"
          onClick={() => {
            setOptions([...options, { name: PRESETS.find((p) => !options.some((o) => o.name === p)) ?? "", values: [] }]);
            setDrafts((d) => [...d, ""]);
          }}
        >
          + أضف خيارات مثل المقاس أو اللون
        </button>
      )}

      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-black/10">
          <table className="w-full text-[13px]">
            <thead className="bg-[#f7f7f7] text-right text-xs text-muted">
              <tr>
                <th className="p-2 font-medium">الخيار</th>
                <th className="p-2 font-medium">
                  السعر{" "}
                  <button type="button" className="text-[#005bd3]" onClick={() => fillAll("price", rows[0]?.price ?? "")}>
                    (عمّم)
                  </button>
                </th>
                <th className="p-2 font-medium">
                  الكمية{" "}
                  <button type="button" className="text-[#005bd3]" onClick={() => fillAll("stock", rows[0]?.stock ?? "")}>
                    (عمّم)
                  </button>
                </th>
                <th className="hidden p-2 font-medium sm:table-cell">SKU</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {rows.map((r, i) => (
                <tr key={r.options.join("|")}>
                  <td className="p-2 font-semibold">{r.title}</td>
                  <td className="p-2">
                    <input className="input !w-24 !py-1" dir="ltr" inputMode="decimal" value={r.price} onChange={(e) => setRow(i, { price: e.target.value })} />
                  </td>
                  <td className="p-2">
                    <input className="input !w-20 !py-1" dir="ltr" inputMode="numeric" placeholder="∞" value={r.stock} onChange={(e) => setRow(i, { stock: e.target.value })} />
                  </td>
                  <td className="hidden p-2 sm:table-cell">
                    <input className="input !w-28 !py-1" dir="ltr" value={r.sku ?? ""} onChange={(e) => setRow(i, { sku: e.target.value })} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="p-2 text-xs text-muted">اترك الكمية فاضية إذا كانت مفتوحة. حط 0 إذا الخيار خالص.</p>
        </div>
      )}
    </div>
  );
}
