"use client";

import { useState } from "react";
import { aiDescribeProduct, type AiProduct } from "./ai-actions";

/**
 * "Write it for me": reads the product's first photo (and the merchant's notes)
 * and fills the title, description, type and details. Nothing is saved until
 * the merchant presses Save, so everything stays editable.
 */
export function AiWriter({
  getForm,
  categories,
  onResult,
}: {
  getForm: () => HTMLFormElement | null;
  categories: string[];
  onResult: (p: AiProduct) => void;
}) {
  const [open, setOpen] = useState(false);
  const [hint, setHint] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ error?: string; ok?: string }>({});

  async function run() {
    const form = getForm();
    if (!form) return;
    let images: string[] = [];
    try {
      images = JSON.parse((form.elements.namedItem("images") as HTMLInputElement)?.value || "[]");
    } catch {}
    const title = (form.elements.namedItem("title") as HTMLInputElement)?.value ?? "";
    setBusy(true);
    setMsg({});
    const res = await aiDescribeProduct({ image: images[0], title, hint, categories });
    setBusy(false);
    if (res.error || !res.data) return setMsg({ error: res.error || "حدث خطأ" });
    onResult(res.data);
    setMsg({ ok: `كُتبت البطاقة. راجعها وعدّل ما تريد قبل الحفظ.${res.left != null ? ` (متبقٍ هذا الشهر: ${res.left})` : ""}` });
  }

  return (
    <div className="rounded-lg border border-[#8a5a2b]/25 bg-[#fbf7f2] p-3 text-[13px]">
      {!open ? (
        <button type="button" className="flex w-full items-center justify-between gap-2 text-start" onClick={() => setOpen(true)}>
          <span>
            <span className="font-semibold">✨ اكتب البطاقة بالذكاء الاصطناعي</span>
            <span className="block text-muted">ارفع صورة المنتج، ويكتب كُن الاسم والوصف والمواصفات.</span>
          </span>
          <span className="btn btn-outline shrink-0">جرّب</span>
        </button>
      ) : (
        <div className="space-y-2">
          <div className="font-semibold">✨ اكتب البطاقة بالذكاء الاصطناعي</div>
          <p className="text-muted">يقرأ أول صورة في المنتج واسمه إن كتبته. أضف ما لا يظهر في الصورة، مثل الوزن أو المادة أو المكوّنات.</p>
          <textarea
            className="input"
            rows={2}
            maxLength={500}
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            placeholder="مثال: وزن كيلوغرام، محشو بالفستق الحلبي، يُحفظ أسبوعين"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn" disabled={busy} onClick={run}>
              {busy ? "جارٍ الكتابة..." : "اكتب البطاقة"}
            </button>
            <span className="text-muted">يستبدل الاسم والوصف والنوع والمواصفات الحالية.</span>
          </div>
        </div>
      )}
      {msg.error && <p className="mt-2 text-red-700">{msg.error}</p>}
      {msg.ok && <p className="mt-2 text-[#1a7f37]">{msg.ok}</p>}
    </div>
  );
}
