"use client";

import { useActionState, useRef, useState } from "react";
import { Field, FormMessage, SubmitButton } from "@/components/form-ui";
import { shrink } from "@/components/image-uploader";
import { SECTION_LABELS, THEMES, newSection } from "@/lib/templates";
import type { Collection, Section, SectionType, ThemeId } from "@/lib/types";
import { uploadImage } from "../products/actions";
import { saveDesign } from "./actions";

type Design = { theme: ThemeId; primary_color: string; logo_url: string; sections: Section[] };

export function DesignEditor({ initial, previewUrl, publicUrl, collections }: { initial: Design; previewUrl: string; publicUrl: string; collections: Pick<Collection, "id" | "title">[] }) {
  const [state, action] = useActionState(saveDesign, undefined);
  const [theme, setTheme] = useState(initial.theme);
  const [color, setColor] = useState(initial.primary_color);
  const [logo, setLogo] = useState(initial.logo_url);
  const [sections, setSections] = useState<Section[]>(initial.sections);
  const [open, setOpen] = useState<number | null>(null);
  const defaultColor = THEMES.find((t) => t.id === theme)?.color ?? "#0f5c4d";

  const update = (i: number, patch: Partial<Section>) =>
    setSections((cur) => cur.map((s, j) => (j === i ? ({ ...s, ...patch } as Section) : s)));
  const move = (i: number, d: number) =>
    setSections((cur) => {
      const j = i + d;
      if (j < 0 || j >= cur.length) return cur;
      const next = [...cur];
      [next[i], next[j]] = [next[j], next[i]];
      setOpen((o) => (o === i ? j : o === j ? i : o));
      return next;
    });

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[420px_1fr]">
      <input type="hidden" name="theme" value={theme} />
      <input type="hidden" name="primary_color" value={color} />
      <input type="hidden" name="logo_url" value={logo} />
      <input type="hidden" name="sections" value={JSON.stringify(sections)} />

      <div className="space-y-4">
        <h1 className="text-2xl">تصميم المتجر</h1>

        <section className="space-y-3 card p-5">
          <h2 className="font-semibold">القالب</h2>
          <div className="grid gap-2">
            {THEMES.map((t) => (
              <button
                type="button"
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`flex items-center gap-3 rounded-theme border-2 p-3 text-right ${theme === t.id ? "border-primary" : "border-black/10"}`}
              >
                <span className="h-8 w-8 shrink-0 rounded-full" style={{ background: t.color }} />
                <span>
                  <span className="block font-semibold">{t.name}</span>
                  <span className="block text-xs text-muted">{t.description}</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3 card p-5">
          <h2 className="font-semibold">اللون والشعار</h2>
          <div className="flex items-center gap-3 text-sm">
            <input type="color" value={color || defaultColor} onChange={(e) => setColor(e.target.value)} className="h-10 w-14 cursor-pointer rounded border border-black/10" />
            <span>اللون الأساسي</span>
            {color && (
              <button type="button" className="text-xs text-muted underline" onClick={() => setColor("")}>
                رجّع لون القالب
              </button>
            )}
          </div>
          <SingleImage label="الشعار (اختياري)" value={logo} onChange={setLogo} />
        </section>

        <section className="space-y-3 card p-5">
          <h2 className="font-semibold">أقسام الصفحة الرئيسية</h2>
          <p className="text-xs text-muted">رتّب الأقسام بالأسهم، واضغط على أي قسم لتعدّل محتواه.</p>
          <ul className="space-y-2">
            {sections.map((s, i) => (
              <li key={i} className={`rounded-theme border border-black/10 ${s.hidden ? "opacity-50" : ""}`}>
                <div className="flex items-center gap-1 p-2 text-sm">
                  <button type="button" className="flex-1 px-1 text-right font-semibold" onClick={() => setOpen(open === i ? null : i)}>
                    {open === i ? "▾" : "▸"} {SECTION_LABELS[s.type]}
                  </button>
                  <IconBtn onClick={() => move(i, -1)} label="لفوق" disabled={i === 0}>
                    ↑
                  </IconBtn>
                  <IconBtn onClick={() => move(i, 1)} label="لتحت" disabled={i === sections.length - 1}>
                    ↓
                  </IconBtn>
                  <IconBtn onClick={() => update(i, { hidden: !s.hidden })} label={s.hidden ? "أظهر" : "اخفي"}>
                    {s.hidden ? "🙈" : "👁"}
                  </IconBtn>
                  <IconBtn
                    onClick={() => {
                      setSections((cur) => cur.filter((_, j) => j !== i));
                      setOpen(null);
                    }}
                    label="احذف"
                  >
                    ✕
                  </IconBtn>
                </div>
                {open === i && (
                  <div className="space-y-3 border-t border-black/5 p-3">
                    <SectionFields section={s} onChange={(p) => update(i, p)} collections={collections} />
                  </div>
                )}
              </li>
            ))}
          </ul>
          <AddSection
            onAdd={(type) => {
              setSections((cur) => [...cur, newSection(type)]);
              setOpen(sections.length);
            }}
          />
        </section>

        <div className="sticky bottom-0 space-y-2 bg-surface py-3">
          <FormMessage state={state} />
          <SubmitButton className="w-full">احفظ التصميم</SubmitButton>
        </div>
      </div>

      <div className="hidden lg:block">
        <div className="sticky top-4 overflow-hidden rounded-theme border border-black/10 bg-white">
          <div className="flex items-center justify-between border-b border-black/5 px-3 py-2 text-xs text-muted">
            <span>معاينة (بتتحدث بعد الحفظ)</span>
            <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="text-primary">
              افتح بصفحة جديدة ↗
            </a>
          </div>
          <iframe key={state?.ok ?? "initial"} src={previewUrl} className="h-[80vh] w-full" title="معاينة المتجر" />
        </div>
      </div>
    </form>
  );
}

function IconBtn({ children, onClick, label, disabled }: { children: React.ReactNode; onClick: () => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label} className="h-8 w-8 rounded hover:bg-surface disabled:opacity-30">
      {children}
    </button>
  );
}

function AddSection({ onAdd }: { onAdd: (t: SectionType) => void }) {
  const [type, setType] = useState<SectionType>("image_text");
  return (
    <div className="flex gap-2">
      <select value={type} onChange={(e) => setType(e.target.value as SectionType)} className="input flex-1">
        {(Object.keys(SECTION_LABELS) as SectionType[]).map((t) => (
          <option key={t} value={t}>
            {SECTION_LABELS[t]}
          </option>
        ))}
      </select>
      <button type="button" onClick={() => onAdd(type)} className="btn btn-outline !py-2 text-sm">
        + أضف قسم
      </button>
    </div>
  );
}

function Text({ label, value, onChange, long }: { label: string; value?: string; onChange: (v: string) => void; long?: boolean }) {
  return (
    <Field label={label}>
      {long ? (
        <textarea className="input" rows={3} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className="input" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
      )}
    </Field>
  );
}

function SectionFields({ section: s, onChange, collections }: { section: Section; onChange: (p: Partial<Section>) => void; collections: Pick<Collection, "id" | "title">[] }) {
  switch (s.type) {
    case "announcement":
      return <Text label="نص الإعلان" value={s.text} onChange={(text) => onChange({ text })} />;
    case "hero":
      return (
        <>
          <Text label="العنوان" value={s.title} onChange={(title) => onChange({ title })} />
          <Text label="النص تحت العنوان" value={s.subtitle} onChange={(subtitle) => onChange({ subtitle })} long />
          <Text label="نص الزر" value={s.buttonText} onChange={(buttonText) => onChange({ buttonText })} />
          <SingleImage label="صورة الخلفية" value={s.image ?? ""} onChange={(image) => onChange({ image: image || undefined })} />
        </>
      );
    case "categories":
      return <Text label="العنوان" value={s.title} onChange={(title) => onChange({ title })} />;
    case "featured_products":
      return (
        <>
          <Text label="العنوان" value={s.title} onChange={(title) => onChange({ title })} />
          <Field label="كم منتج يظهر">
            <input type="number" min={2} max={24} className="input" value={s.limit ?? 8} onChange={(e) => onChange({ limit: Number(e.target.value) })} />
          </Field>
        </>
      );
    case "image_text":
      return (
        <>
          <Text label="العنوان" value={s.title} onChange={(title) => onChange({ title })} />
          <Text label="النص" value={s.text} onChange={(text) => onChange({ text })} long />
          <SingleImage label="الصورة" value={s.image ?? ""} onChange={(image) => onChange({ image: image || undefined })} />
        </>
      );
    case "testimonials":
      return (
        <>
          <Text label="العنوان" value={s.title} onChange={(title) => onChange({ title })} />
          {s.items.map((item, i) => (
            <div key={i} className="space-y-2 rounded-theme bg-surface p-2">
              <input className="input" placeholder="اسم الزبون" value={item.name} onChange={(e) => onChange({ items: s.items.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
              <textarea className="input" rows={2} placeholder="شو قال" value={item.text} onChange={(e) => onChange({ items: s.items.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) })} />
              <button type="button" className="text-xs text-red-700" onClick={() => onChange({ items: s.items.filter((_, j) => j !== i) })}>
                احذف الرأي
              </button>
            </div>
          ))}
          {s.items.length < 6 && (
            <button type="button" className="text-sm text-primary" onClick={() => onChange({ items: [...s.items, { name: "", text: "" }] })}>
              + أضف رأي
            </button>
          )}
        </>
      );
    case "whatsapp_cta":
      return (
        <>
          <Text label="العنوان" value={s.title} onChange={(title) => onChange({ title })} />
          <Text label="النص" value={s.text} onChange={(text) => onChange({ text })} />
        </>
      );
    case "collection_products":
      return (
        <>
          <Text label="العنوان" value={s.title} onChange={(title) => onChange({ title })} />
          <Field label="المجموعة">
            <select className="input" value={s.collectionId ?? ""} onChange={(e) => onChange({ collectionId: e.target.value || undefined })}>
              <option value="">اختار مجموعة</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </Field>
          <Field label="كم منتج يظهر">
            <input type="number" min={2} max={24} className="input" value={s.limit ?? 8} onChange={(e) => onChange({ limit: Number(e.target.value) })} />
          </Field>
        </>
      );
    case "image_banner":
      return (
        <>
          <SingleImage label="الصورة" value={s.image ?? ""} onChange={(image) => onChange({ image: image || undefined })} />
          <Text label="العنوان" value={s.title} onChange={(title) => onChange({ title })} />
          <Text label="النص" value={s.text} onChange={(text) => onChange({ text })} />
          <Text label="نص الزر" value={s.buttonText} onChange={(buttonText) => onChange({ buttonText })} />
          <Field label="الزر بيفتح" hint="مثلاً /products أو /collections/offers">
            <input className="input" dir="ltr" value={s.link ?? ""} onChange={(e) => onChange({ link: e.target.value })} />
          </Field>
        </>
      );
    case "features":
      return (
        <>
          {s.items.map((item, i) => (
            <div key={i} className="flex items-start gap-2 rounded-theme bg-surface p-2">
              <input className="input !w-14 text-center" value={item.icon} onChange={(e) => onChange({ items: s.items.map((x, j) => (j === i ? { ...x, icon: e.target.value } : x)) })} />
              <div className="flex-1 space-y-1">
                <input className="input" placeholder="العنوان" value={item.title} onChange={(e) => onChange({ items: s.items.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })} />
                <input className="input" placeholder="وصف قصير" value={item.text ?? ""} onChange={(e) => onChange({ items: s.items.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) })} />
              </div>
              <button type="button" className="text-muted" onClick={() => onChange({ items: s.items.filter((_, j) => j !== i) })} aria-label="احذف">
                ✕
              </button>
            </div>
          ))}
          {s.items.length < 6 && (
            <button type="button" className="text-sm text-primary" onClick={() => onChange({ items: [...s.items, { icon: "⭐", title: "", text: "" }] })}>
              + أضف ميزة
            </button>
          )}
        </>
      );
    case "faq":
      return (
        <>
          <Text label="العنوان" value={s.title} onChange={(title) => onChange({ title })} />
          {s.items.map((item, i) => (
            <div key={i} className="space-y-1 rounded-theme bg-surface p-2">
              <input className="input" placeholder="السؤال" value={item.q} onChange={(e) => onChange({ items: s.items.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)) })} />
              <textarea className="input" rows={2} placeholder="الجواب" value={item.a} onChange={(e) => onChange({ items: s.items.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)) })} />
              <button type="button" className="text-xs text-red-700" onClick={() => onChange({ items: s.items.filter((_, j) => j !== i) })}>
                احذف السؤال
              </button>
            </div>
          ))}
          <button type="button" className="text-sm text-primary" onClick={() => onChange({ items: [...s.items, { q: "", a: "" }] })}>
            + أضف سؤال
          </button>
        </>
      );
    case "rich_text":
      return (
        <>
          <Text label="العنوان" value={s.title} onChange={(title) => onChange({ title })} />
          <Text label="النص" value={s.text} onChange={(text) => onChange({ text })} long />
        </>
      );
  }
}

function SingleImage({ label, value, onChange }: { label: string; value: string; onChange: (url: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="space-y-2 text-sm">
      <span className="font-semibold">{label}</span>
      <div className="flex items-center gap-3">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="h-16 w-24 rounded-theme bg-surface object-cover" />
        ) : (
          <div className="flex h-16 w-24 items-center justify-center rounded-theme bg-surface text-xs text-muted">بلا صورة</div>
        )}
        <button type="button" className="btn btn-outline !py-1.5 text-xs" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? "جاري الرفع..." : value ? "غيّر" : "ارفع صورة"}
        </button>
        {value && (
          <button type="button" className="text-xs text-muted underline" onClick={() => onChange("")}>
            شيل
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setBusy(true);
          setError("");
          const form = new FormData();
          const blob = await shrink(file);
          form.append("file", new File([blob], "image", { type: blob.type || file.type }));
          const res = await uploadImage(form);
          setBusy(false);
          if (res.url) onChange(res.url);
          else setError(res.error || "صار خطأ");
          e.target.value = "";
        }}
      />
      {error && <p className="text-red-700">{error}</p>}
    </div>
  );
}
