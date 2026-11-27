"use client";

import Link from "next/link";
import { useState } from "react";
import { shrink } from "@/components/image-uploader";
import { addListedProducts, aiReadPriceList, type ListItem } from "../ai-actions";

type Row = ListItem & { on: boolean; price_text: string };

/** Photo of a price list → reviewable table → products. */
export function AiListImport({ unit }: { unit: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState<"" | "read" | "add">("");
  const [msg, setMsg] = useState<{ error?: string; ok?: string }>({});
  const [left, setLeft] = useState<number | null>(null);

  async function read(file: File | undefined) {
    if (!file) return;
    setBusy("read");
    setMsg({});
    const blob = await shrink(file, 2000);
    const form = new FormData();
    form.append("file", new File([blob], "list", { type: blob.type || file.type }));
    const res = await aiReadPriceList(form);
    setBusy("");
    if (res.left != null) setLeft(res.left);
    if (res.error || !res.items) return setMsg({ error: res.error || "حدث خطأ" });
    setRows(res.items.map((i) => ({ ...i, on: i.price != null, price_text: i.price != null ? String(i.price) : "" })));
  }

  const edit = (i: number, patch: Partial<Row>) => setRows((cur) => cur.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const chosen = rows.filter((r) => r.on);
  const bad = chosen.filter((r) => r.price_text.trim() === "" || !Number.isFinite(Number(r.price_text.replace(/[,\s]/g, ""))));

  async function add() {
    setBusy("add");
    setMsg({});
    const res = await addListedProducts(chosen.map((r) => ({ title: r.title, price: Number(r.price_text.replace(/[,\s]/g, "")), category: r.category })));
    setBusy("");
    if (res.error) return setMsg({ error: res.error });
    setRows([]);
    setMsg({ ok: res.ok });
  }

  return (
    <div className="space-y-3 text-[13px]">
      {rows.length === 0 ? (
        <>
          <p className="text-muted">
            صوّر قائمة أسعارك، ورقة أو لوحة أو لقطة شاشة، ويقرأ كُن منها أسماء المنتجات وأسعارها. تراجع القائمة وتعدّلها قبل الإضافة.
          </p>
          <label className={`btn inline-flex cursor-pointer ${busy ? "pointer-events-none opacity-60" : ""}`}>
            {busy === "read" ? "جارٍ قراءة القائمة..." : "اختر صورة القائمة"}
            <input type="file" accept="image/*" hidden onChange={(e) => read(e.target.files?.[0])} />
          </label>
          {busy === "read" && <p className="text-muted">قد تستغرق القراءة نصف دقيقة للقوائم الطويلة.</p>}
        </>
      ) : (
        <>
          <p className="text-muted">
            وُجد {rows.length} منتجاً. تحقّق من الأسماء والأسعار ({unit})، وأزل علامة ما لا تريد إضافته.
          </p>
          <div className="max-h-[480px] overflow-auto rounded-lg border border-black/10">
            <table className="w-full">
              <thead className="sticky top-0 bg-[#f7f7f7] text-start text-xs text-muted">
                <tr>
                  <th className="w-8 p-2" />
                  <th className="p-2 text-start">الاسم</th>
                  <th className="w-32 p-2 text-start">السعر</th>
                  <th className="w-32 p-2 text-start">النوع</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className={`border-t border-black/5 ${r.on ? "" : "opacity-50"}`}>
                    <td className="p-2">
                      <input type="checkbox" className="h-4 w-4 accent-black" checked={r.on} onChange={(e) => edit(i, { on: e.target.checked })} />
                    </td>
                    <td className="p-1">
                      <input className="input !py-1.5" value={r.title} onChange={(e) => edit(i, { title: e.target.value })} />
                    </td>
                    <td className="p-1">
                      <input
                        className={`input !py-1.5 ${r.on && r.price_text.trim() === "" ? "!border-red-400" : ""}`}
                        dir="ltr"
                        inputMode="decimal"
                        value={r.price_text}
                        placeholder="السعر"
                        onChange={(e) => edit(i, { price_text: e.target.value })}
                      />
                    </td>
                    <td className="p-1">
                      <input className="input !py-1.5" value={r.category} onChange={(e) => edit(i, { category: e.target.value })} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn" disabled={!!busy || chosen.length === 0 || bad.length > 0} onClick={add}>
              {busy === "add" ? "جارٍ الإضافة..." : `أضف ${chosen.length} منتجاً`}
            </button>
            <button type="button" className="btn btn-outline" disabled={!!busy} onClick={() => setRows([])}>
              إلغاء
            </button>
            {bad.length > 0 && <span className="text-red-700">أدخل سعراً صحيحاً لـ {bad.length} منتج، أو أزل علامته.</span>}
          </div>
        </>
      )}
      {msg.error && <p className="text-red-700">{msg.error}</p>}
      {msg.ok && (
        <p className="text-[#1a7f37]">
          {msg.ok}{" "}
          <Link href="/dashboard/products" className="font-semibold text-[#005bd3] hover:underline">
            عرض المنتجات
          </Link>
        </p>
      )}
      {left != null && <p className="text-xs text-muted">متبقٍ من طلبات الذكاء الاصطناعي هذا الشهر: {left}</p>}
    </div>
  );
}
