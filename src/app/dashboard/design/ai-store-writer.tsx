"use client";

import { useState } from "react";
import { aiApplyStore, aiDraftStore, type StoreDraft } from "./ai-actions";

/** "Describe your shop": drafts every text of the store, shows it, and applies it only when approved. */
export function AiStoreWriter({ open: startOpen }: { open?: boolean }) {
  const [desc, setDesc] = useState("");
  const [draft, setDraft] = useState<StoreDraft | null>(null);
  const [busy, setBusy] = useState<"" | "draft" | "apply">("");
  const [msg, setMsg] = useState<{ error?: string; ok?: string }>({});
  const [left, setLeft] = useState<number | null>(null);

  async function write() {
    setBusy("draft");
    setMsg({});
    const res = await aiDraftStore(desc);
    setBusy("");
    if (res.left != null) setLeft(res.left);
    if (res.error || !res.draft) return setMsg({ error: res.error || "حدث خطأ" });
    setDraft(res.draft);
  }

  async function apply() {
    if (!draft) return;
    setBusy("apply");
    const res = await aiApplyStore(draft);
    setBusy("");
    if (res.error) return setMsg({ error: res.error });
    setDraft(null);
    setMsg({ ok: res.ok });
  }

  return (
    <details open={startOpen} className="card mb-4 border border-[#8a5a2b]/25 bg-[#fbf7f2] p-4 text-[13px]">
      <summary className="cursor-pointer font-semibold">✨ اكتب نصوص متجرك بالذكاء الاصطناعي</summary>
      <div className="mt-3 space-y-3">
        {!draft ? (
          <>
            <p className="text-muted">
              صف متجرك في جملتين أو ثلاث، ويكتب كُن الشريط العلوي والعنوان الرئيسي والميزات والأسئلة الشائعة وصفحات من نحن والتوصيل والإرجاع. يأخذ أجور التوصيل وطرق الدفع من إعداداتك كما هي.
            </p>
            <textarea
              className="input"
              rows={3}
              maxLength={1500}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="مثال: محل حلويات شامية في دمشق منذ 1995، نصنع البقلاوة والمعمول بالسمن العربي كل صباح، ونجهّز علب ضيافة للأعراس."
            />
            <button type="button" className="btn" disabled={!!busy || desc.trim().length < 10} onClick={write}>
              {busy === "draft" ? "جارٍ الكتابة، قد تستغرق نصف دقيقة..." : "اكتب النصوص"}
            </button>
          </>
        ) : (
          <>
            <p className="text-muted">هذه مسودة، ولم يتغير شيء في متجرك بعد. راجعها ثم طبّقها، أو أعد الكتابة بوصف مختلف.</p>
            <div className="space-y-3 rounded-lg border border-black/10 bg-white p-3">
              <Row label="العبارة تحت الاسم">{draft.tagline}</Row>
              {draft.color && (
                <Row label="اللون">
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-block h-4 w-4 rounded" style={{ background: draft.color }} />
                    <span dir="ltr">{draft.color}</span>
                  </span>
                </Row>
              )}
              <Row label="الشريط العلوي">{draft.announcement}</Row>
              <Row label="العنوان الرئيسي">
                <b>{draft.hero.title}</b>
                <div>{draft.hero.subtitle}</div>
                <div className="text-muted">الزر: {draft.hero.buttonText}</div>
              </Row>
              <Row label="الميزات">
                <ul className="space-y-1">
                  {draft.features.map((f, i) => (
                    <li key={i}>
                      {f.icon} <b>{f.title}</b>: {f.text}
                    </li>
                  ))}
                </ul>
              </Row>
              <Row label="الأسئلة الشائعة">
                <ul className="space-y-1.5">
                  {draft.faq.map((f, i) => (
                    <li key={i}>
                      <b>{f.q}</b>
                      <div className="text-muted">{f.a}</div>
                    </li>
                  ))}
                </ul>
              </Row>
              <Row label="دعوة واتساب">
                <b>{draft.cta.title}</b> {draft.cta.text}
              </Row>
              {(["about", "shipping", "returns"] as const).map((k) => (
                <Row key={k} label={{ about: "صفحة من نحن", shipping: "صفحة التوصيل والدفع", returns: "صفحة الإرجاع" }[k]}>
                  <div className="whitespace-pre-line">{draft[k].replace(/^## /gm, "")}</div>
                </Row>
              ))}
            </div>
            <p className="text-muted">
              عند التطبيق: تُستبدل نصوص الشريط العلوي والعنوان الرئيسي والميزات والأسئلة ودعوة واتساب، وتُحدَّث الصفحات الثلاث. تبقى الصور وأقسام المنتجات كما هي.
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn" disabled={!!busy} onClick={apply}>
                {busy === "apply" ? "جارٍ التطبيق..." : "طبّق على متجري"}
              </button>
              <button type="button" className="btn btn-outline" disabled={!!busy} onClick={write}>
                {busy === "draft" ? "جارٍ الكتابة..." : "اكتب مسودة أخرى"}
              </button>
              <button type="button" className="btn btn-outline" disabled={!!busy} onClick={() => setDraft(null)}>
                تعديل الوصف
              </button>
            </div>
          </>
        )}
        {msg.error && <p className="text-red-700">{msg.error}</p>}
        {msg.ok && <p className="text-[#1a7f37]">{msg.ok}</p>}
        {left != null && <p className="text-xs text-muted">متبقٍ من طلبات الذكاء الاصطناعي هذا الشهر: {left}</p>}
      </div>
    </details>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div className="grid gap-1 sm:grid-cols-[140px_1fr]">
      <div className="text-xs font-semibold text-muted">{label}</div>
      <div>{children}</div>
    </div>
  );
}
