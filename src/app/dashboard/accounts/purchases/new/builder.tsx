"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { shrink } from "@/components/image-uploader";
import { aiReadInvoice, savePurchase } from "../../actions";

type Product = { id: string; title: string; variants: { id: string; title: string }[] };
type Line = { key: number; text: string; productId: string | null; variantId: string | null; qty: string; cost: string };

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
let seq = 1;
const blank = (): Line => ({ key: seq++, text: "", productId: null, variantId: null, qty: "1", cost: "" });

/** A supplier invoice: typed by hand or read from a photo, each line linked to a product. */
export function PurchaseBuilder({
  suppliers,
  products,
  supplierId: startSupplier,
  today,
  paidFrom,
  branches,
  unit,
}: {
  suppliers: { id: string; name: string }[];
  products: Product[];
  supplierId: string;
  today: string;
  paidFrom: Record<string, string>;
  branches: { id: string; name: string }[];
  unit: string;
}) {
  const router = useRouter();
  const [supplierId, setSupplierId] = useState(startSupplier);
  const [newSupplier, setNewSupplier] = useState("");
  const [day, setDay] = useState(today);
  const [ref, setRef] = useState("");
  const [lines, setLines] = useState<Line[]>([blank()]);
  const [paid, setPaid] = useState("");
  const [paidFromV, setPaidFromV] = useState("cash");
  const [branch, setBranch] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"" | "read" | "save">("");
  const [msg, setMsg] = useState<{ error?: string; ok?: string }>({});

  const byTitle = useMemo(() => new Map(products.map((p) => [norm(p.title), p])), [products]);
  const match = (text: string): Product | null => {
    const n = norm(text);
    if (!n) return null;
    if (byTitle.has(n)) return byTitle.get(n)!;
    const hits = products.filter((p) => {
      const t = norm(p.title);
      return t.length > 2 && (t.includes(n) || n.includes(t));
    });
    return hits.length === 1 ? hits[0] : null;
  };

  const edit = (key: number, patch: Partial<Line>) => setLines((cur) => cur.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const total = lines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.cost) || 0), 0);
  const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });

  async function read(file?: File) {
    if (!file) return;
    setBusy("read");
    setMsg({});
    const blob = await shrink(file, 2000);
    const form = new FormData();
    form.append("file", new File([blob], "invoice", { type: blob.type || file.type }));
    const res = await aiReadInvoice(form);
    setBusy("");
    if (res.error || !res.data) return setMsg({ error: res.error || "حدث خطأ" });
    const d = res.data;
    setLines(
      d.lines.map((l) => {
        const p = match(l.title);
        return { key: seq++, text: p ? p.title : l.title, productId: p?.id ?? null, variantId: null, qty: String(l.qty), cost: l.cost == null ? "" : String(l.cost) };
      }),
    );
    if (d.ref) setRef(d.ref);
    if (d.day) setDay(d.day);
    if (d.supplier && !supplierId) {
      const s = suppliers.find((x) => norm(x.name) === norm(d.supplier));
      if (s) setSupplierId(s.id);
      else {
        setSupplierId("new");
        setNewSupplier(d.supplier);
      }
    }
    setMsg({ ok: `قُرئت ${d.lines.length} أسطر. تحقّق من الأسماء والكميات والأسعار، واربط كل سطر بمنتجه ليزيد مخزونه.${res.left != null ? ` (متبقٍ هذا الشهر: ${res.left})` : ""}` });
  }

  async function save() {
    setBusy("save");
    setMsg({});
    const res = await savePurchase({
      supplierId: supplierId && supplierId !== "new" ? supplierId : null,
      newSupplier: supplierId === "new" ? newSupplier : "",
      day,
      ref,
      lines: lines
        .filter((l) => l.text.trim())
        .map((l) => ({ productId: l.productId, variantId: l.variantId, title: l.text, qty: Number(l.qty), cost: Number(l.cost) })),
      paid: paid.trim() === "" ? 0 : Number(paid),
      paidFrom: paidFromV,
      branch,
      note,
    });
    setBusy("");
    if (res.error) return setMsg({ error: res.error });
    router.push("/dashboard/accounts/purchases?saved=1");
  }

  const due = Math.max(0, total - (Number(paid) || 0));

  return (
    <div className="space-y-4">
      <section className="card flex flex-wrap items-center justify-between gap-3 border border-[#8a5a2b]/25 bg-[#fbf7f2] p-4 text-[13px]">
        <span>
          <span className="font-semibold">✨ صوّر فاتورة المورد</span>
          <span className="block text-muted">يقرأ كُن الأصناف والكميات والأسعار، ويربطها بمنتجاتك.</span>
        </span>
        <label className={`btn cursor-pointer ${busy ? "pointer-events-none opacity-60" : ""}`}>
          {busy === "read" ? "جارٍ القراءة..." : "اختر صورة الفاتورة"}
          <input type="file" accept="image/*" hidden onChange={(e) => read(e.target.files?.[0])} />
        </label>
      </section>

      <section className="card grid gap-3 p-4 text-[13px] sm:grid-cols-3">
        <label className="flex flex-col gap-1.5">
          <span className="font-semibold">المورد</span>
          <select className="input" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            <option value="">دون مورد</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
            <option value="new">+ مورد جديد</option>
          </select>
          {supplierId === "new" && <input className="input" value={newSupplier} onChange={(e) => setNewSupplier(e.target.value)} placeholder="اسم المورد" maxLength={80} />}
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-semibold">التاريخ</span>
          <input type="date" className="input" dir="ltr" value={day} max={today} onChange={(e) => setDay(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-semibold">رقم الفاتورة (اختياري)</span>
          <input className="input" dir="ltr" value={ref} onChange={(e) => setRef(e.target.value)} maxLength={60} />
        </label>
      </section>

      <section className="card space-y-3 p-4 text-[13px]">
        <h2 className="font-semibold">الأصناف</h2>
        <datalist id="kun-products">
          {products.map((p) => (
            <option key={p.id} value={p.title} />
          ))}
        </datalist>
        <ul className="space-y-3">
          {lines.map((l) => {
            const p = l.productId ? products.find((x) => x.id === l.productId) : null;
            return (
              <li key={l.key} className="grid grid-cols-2 gap-2 rounded-lg border border-black/10 p-2.5 sm:grid-cols-[1fr_90px_120px_auto]">
                <div className="col-span-2 space-y-1 sm:col-span-1">
                  <input
                    className="input !py-1.5"
                    list="kun-products"
                    value={l.text}
                    placeholder="اسم الصنف أو اختر منتجاً"
                    onChange={(e) => {
                      const hit = byTitle.get(norm(e.target.value)) ?? null;
                      edit(l.key, { text: e.target.value, productId: hit?.id ?? null, variantId: null });
                    }}
                  />
                  {p ? (
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#1a7f37]">
                      ✓ مرتبط بالمنتج
                      {p.variants.length > 0 && (
                        <select className="input w-auto !py-1 text-xs" value={l.variantId ?? ""} onChange={(e) => edit(l.key, { variantId: e.target.value || null })}>
                          <option value="">اختر الخيار</option>
                          {p.variants.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.title}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  ) : (
                    l.text.trim() && <div className="text-xs text-muted">غير مرتبط بمنتج: لن يتغير المخزون</div>
                  )}
                </div>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-muted">الكمية</span>
                  <input className="input !py-1.5" dir="ltr" inputMode="numeric" value={l.qty} onChange={(e) => edit(l.key, { qty: e.target.value })} />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-muted">سعر الوحدة ({unit})</span>
                  <input className={`input !py-1.5 ${l.text.trim() && l.cost.trim() === "" ? "!border-red-400" : ""}`} dir="ltr" inputMode="decimal" value={l.cost} onChange={(e) => edit(l.key, { cost: e.target.value })} />
                </label>
                <div className="col-span-2 flex items-end justify-between gap-2 sm:col-span-1 sm:flex-col sm:items-end">
                  <span className="text-xs text-muted" dir="ltr">{fmt((Number(l.qty) || 0) * (Number(l.cost) || 0))}</span>
                  <button type="button" className="rounded p-1 text-muted hover:text-red-700" aria-label="حذف السطر" onClick={() => setLines((cur) => (cur.length > 1 ? cur.filter((x) => x.key !== l.key) : [blank()]))}>
                    ✕
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
        <button type="button" className="btn btn-outline" onClick={() => setLines((cur) => [...cur, blank()])}>
          + سطر
        </button>
        <div className="flex items-baseline justify-between border-t border-black/10 pt-3">
          <span className="font-semibold">المجموع</span>
          <span className="text-xl font-bold" dir="ltr">
            {fmt(total)} {unit}
          </span>
        </div>
      </section>

      <section className="card grid gap-3 p-4 text-[13px] sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="font-semibold">المدفوع الآن ({unit})</span>
          <div className="flex gap-2">
            <input className="input" dir="ltr" inputMode="decimal" value={paid} onChange={(e) => setPaid(e.target.value)} placeholder="0" />
            <button type="button" className="btn btn-outline shrink-0" onClick={() => setPaid(String(Math.round(total * 100) / 100))}>
              كامل المبلغ
            </button>
          </div>
          <span className="text-xs text-muted">{due > 0.009 ? `يُسجَّل ${fmt(due)} ديناً عليك للمورد.` : "الفاتورة مدفوعة بالكامل."}</span>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-semibold">دُفع من</span>
          <select className="input" value={paidFromV} onChange={(e) => setPaidFromV(e.target.value)}>
            {Object.entries(paidFrom).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        {branches.length > 1 && (
          <label className="flex flex-col gap-1.5">
            <span className="font-semibold">الفرع</span>
            <select className="input" value={branch} onChange={(e) => setBranch(e.target.value)}>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="font-semibold">ملاحظة (اختياري)</span>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
        </label>
      </section>

      {msg.error && <p className="rounded-lg bg-red-50 p-3 text-[13px] text-red-700">{msg.error}</p>}
      {msg.ok && <p className="rounded-lg bg-green-50 p-3 text-[13px] text-green-800">{msg.ok}</p>}
      <button type="button" className="btn w-full sm:w-auto" disabled={!!busy || total <= 0} onClick={save}>
        {busy === "save" ? "جارٍ الحفظ..." : "احفظ الفاتورة وأدخل البضاعة"}
      </button>
    </div>
  );
}
