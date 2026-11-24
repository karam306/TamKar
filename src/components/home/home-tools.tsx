"use client";

import Link from "next/link";
import { useId, useState } from "react";

/* ------------------------------------------------------------------
   1. "Build your store" preview: pick an activity, a name and a colour,
   see the store change live, then carry the answers into signup.
   ------------------------------------------------------------------ */

type Kind = {
  id: string;
  label: string;
  icon: string;
  name: string;
  tagline: string;
  banner: string;
  currency: string;
  color: string;
  items: { name: string; price: string; icon: string; tone: string }[];
};

const KINDS: Kind[] = [
  {
    id: "food",
    label: "حلويات ومطاعم",
    icon: "🍰",
    name: "حلويات الياسمين",
    tagline: "حلويات شامية طازجة كل يوم",
    banner: "طازجة من فرننا اليوم",
    currency: "ل.س",
    color: "#8d5a2b",
    items: [
      { name: "معمول بالتمر", price: "95,000", icon: "🥮", tone: "#f6d7b0" },
      { name: "بقلاوة مشكلة", price: "140,000", icon: "🍯", tone: "#e9efc9" },
      { name: "كنافة", price: "120,000", icon: "🧇", tone: "#f9d9c4" },
      { name: "غريبة", price: "70,000", icon: "🍪", tone: "#fbe6c9" },
    ],
  },
  {
    id: "clothing",
    label: "ملابس وأحذية",
    icon: "👗",
    name: "لمار",
    tagline: "أزياء نسائية عصرية",
    banner: "تشكيلة الشتاء وصلت",
    currency: "$",
    color: "#c2185b",
    items: [
      { name: "معطف صوف", price: "45", icon: "🧥", tone: "#f3d6df" },
      { name: "فستان سهرة", price: "38", icon: "👗", tone: "#ead9f0" },
      { name: "حذاء جلد", price: "29", icon: "👢", tone: "#f1e4d6" },
      { name: "حقيبة يد", price: "22", icon: "👜", tone: "#f6dfd8" },
    ],
  },
  {
    id: "beauty",
    label: "عطور وتجميل",
    icon: "🌸",
    name: "عبق",
    tagline: "عطور شرقية وغربية أصلية",
    banner: "عطرك المفضل بسعر أفضل",
    currency: "$",
    color: "#7c3aed",
    items: [
      { name: "عطر عود", price: "35", icon: "🫙", tone: "#e7defa" },
      { name: "مسك أبيض", price: "18", icon: "🧴", tone: "#f2e9fb" },
      { name: "بخور", price: "12", icon: "🪔", tone: "#f6e6d4" },
      { name: "مجموعة هدايا", price: "49", icon: "🎁", tone: "#efe0f0" },
    ],
  },
  {
    id: "home",
    label: "أدوات منزلية",
    icon: "🍽️",
    name: "بيت المطبخ",
    tagline: "أدوات مطبخ وسفرة بجودة عالية",
    banner: "مائدتك تستحق الأفضل",
    currency: "$",
    color: "#0f5c4d",
    items: [
      { name: "طقم صحون", price: "42", icon: "🍽️", tone: "#dcebe5" },
      { name: "طنجرة ستانلس", price: "27", icon: "🍲", tone: "#e6efe9" },
      { name: "كاسات زجاج", price: "15", icon: "🥛", tone: "#e2eef0" },
      { name: "سكاكين", price: "19", icon: "🔪", tone: "#e9ece4" },
    ],
  },
  {
    id: "phones",
    label: "هواتف وإلكترونيات",
    icon: "📱",
    name: "تك ستور",
    tagline: "هواتف وإكسسوارات بكفالة",
    banner: "كفالة حقيقية على كل جهاز",
    currency: "$",
    color: "#1d4ed8",
    items: [
      { name: "هاتف ذكي", price: "210", icon: "📱", tone: "#dde6fb" },
      { name: "سماعات", price: "25", icon: "🎧", tone: "#e4e9f5" },
      { name: "شاحن سريع", price: "9", icon: "🔌", tone: "#e6edf7" },
      { name: "ساعة ذكية", price: "48", icon: "⌚", tone: "#dfe4f0" },
    ],
  },
];

const COLORS = ["#0f5c4d", "#8d5a2b", "#c2185b", "#7c3aed", "#1d4ed8", "#111827"];

export function StoreBuilder() {
  const [kindId, setKindId] = useState("food");
  const [name, setName] = useState("");
  const [color, setColor] = useState<string | null>(null);
  const kind = KINDS.find((k) => k.id === kindId) ?? KINDS[0];
  const c = color ?? kind.color;
  const shown = name.trim() || kind.name;
  const inputId = useId();

  const params = new URLSearchParams({ type: kind.id, color: c });
  if (name.trim()) params.set("store", name.trim());

  return (
    <div className="kun-builder grid items-center gap-8 lg:grid-cols-[1fr_380px]">
      <div className="space-y-7">
        <div>
          <div className="mb-3 font-semibold">1. ما نشاط محلك؟</div>
          <div className="flex flex-wrap gap-2">
            {KINDS.map((k) => (
              <button
                key={k.id}
                type="button"
                onClick={() => {
                  setKindId(k.id);
                  setColor(null);
                }}
                className={`kun-chip ${k.id === kindId ? "is-on" : ""}`}
                aria-pressed={k.id === kindId}
              >
                <span aria-hidden>{k.icon}</span> {k.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor={inputId} className="mb-3 block font-semibold">
            2. ما اسم محلك؟
          </label>
          <input
            id={inputId}
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 30))}
            placeholder={kind.name}
            className="kun-input"
            autoComplete="off"
          />
        </div>
        <div>
          <div className="mb-3 font-semibold">3. اختر لون متجرك</div>
          <div className="flex flex-wrap gap-3">
            {COLORS.map((col) => (
              <button
                key={col}
                type="button"
                onClick={() => setColor(col)}
                className={`kun-swatch ${col === c ? "is-on" : ""}`}
                style={{ background: col }}
                aria-label={`اللون ${col}`}
                aria-pressed={col === c}
              />
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Link href={`/signup?${params.toString()}`} className="nama-btn text-lg">
            أنشئ هذا المتجر مجاناً
          </Link>
          <span className="text-sm text-[var(--mute)]">نحفظ اختياراتك، وتكمل من حيث توقفت.</span>
        </div>
      </div>

      {/* Live preview */}
      <div className="order-first mx-auto w-full max-w-[300px] lg:order-none lg:max-w-[340px]" aria-live="polite">
        <div className="nama-phone kun-preview" style={{ "--c": c } as React.CSSProperties}>
          <div className="flex items-center justify-between border-b border-black/5 bg-white px-4 pb-3 pt-6 text-black">
            <span className="truncate text-[17px] font-bold transition-colors" style={{ color: c }}>
              {shown}
            </span>
            <span className="text-lg" aria-hidden>
              🛍️
            </span>
          </div>
          <div key={kind.id} className="kun-swap bg-[#fbfbf8] pb-4">
            <div className="mx-3 mt-3 rounded-2xl px-4 py-4 text-white transition-colors" style={{ background: c }}>
              <div className="text-[15px] font-bold">{kind.banner}</div>
              <div className="text-[11.5px] text-white/80">{kind.tagline}</div>
            </div>
            <div className="grid grid-cols-2 gap-2.5 p-3">
              {kind.items.map((p) => (
                <div key={p.name} className="overflow-hidden rounded-xl bg-white text-black ring-1 ring-black/5">
                  <div className="grid aspect-[4/3] place-items-center text-3xl" style={{ background: p.tone }}>
                    {p.icon}
                  </div>
                  <div className="p-2">
                    <div className="text-[12px] font-semibold">{p.name}</div>
                    <div className="mb-1.5 text-[11px] text-black/55" dir={kind.currency === "$" ? "ltr" : undefined} style={{ textAlign: "right" }}>
                      {kind.currency === "$" ? `$${p.price}` : `${p.price} ل.س`}
                    </div>
                    <div className="rounded-lg py-1 text-center text-[11px] font-semibold text-white transition-colors" style={{ background: c }}>
                      أضف إلى السلة
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mx-3 rounded-xl bg-[#25D366] py-2.5 text-center text-[13px] font-bold text-white">اطلب عبر واتساب</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   2. Time calculator: how many hours a month go into answering "how much?"
   ------------------------------------------------------------------ */

const QUESTIONS = ["كم السعر؟", "هل يتوفر مقاس أكبر؟", "ما الألوان المتاحة؟", "كم السعر من فضلك؟", "أين يقع المحل؟", "هل التوصيل متاح؟", "كم السعر؟"];

export function TimeCalculator() {
  const [n, setN] = useState(20);
  const id = useId();
  // Assumption shown to the visitor: about 3 minutes per reply (read, check, answer), 26 working days a month.
  const perDay = n * 3;
  const hours = Math.round((perDay * 26) / 60);
  const days = Math.round((hours / 8) * 10) / 10;

  return (
    <div className="grid items-center gap-10 lg:grid-cols-2">
      <div className="kun-chaos" data-reveal aria-hidden>
        <div className="kun-chaos-head">
          <span className="h-8 w-8 rounded-full bg-white/20" />
          <div className="text-sm font-semibold">رسائل غير مقروءة ({n})</div>
        </div>
        <div className="space-y-2 p-4">
          {QUESTIONS.map((q, i) => (
            <div key={i} className="kun-q" style={{ "--d": `${i * 0.18}s` } as React.CSSProperties}>
              {q}
              <span className="kun-q-time">9:{String(12 + i * 3).padStart(2, "0")}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="order-first lg:order-none">
        <label htmlFor={id} className="mb-2 block text-lg font-semibold">
          كم رسالة تصلك يومياً تسأل عن السعر أو المقاس أو المكان؟
        </label>
        <div className="mb-6 flex items-center gap-4">
          <input id={id} type="range" min={5} max={80} step={5} value={n} onChange={(e) => setN(Number(e.target.value))} className="kun-range flex-1" style={{ "--p": `${((n - 5) / 75) * 100}%` } as React.CSSProperties} />
          <span className="brand-display w-14 text-center text-3xl" dir="ltr">
            {n}
          </span>
        </div>
        <div className="rounded-3xl bg-[var(--card)] p-6 ring-1 ring-black/5">
          <div className="text-[var(--mute)]">تقضي في الرد عليها نحو</div>
          <div className="my-1 flex items-baseline gap-2">
            <span className="brand-display hl hl-apricot text-6xl" dir="ltr">
              {hours}
            </span>
            <span className="text-2xl font-semibold">ساعة شهرياً</span>
          </div>
          <div className="text-[var(--mute)]">
            أي نحو {perDay} دقيقة كل يوم، وما يعادل {days.toLocaleString("en-US")} أيام عمل كاملة في الشهر.
          </div>
          <p className="mt-4 border-t border-black/10 pt-4 leading-8">
            في متجرك على <b>كُن</b> يرى الزبون السعر والمقاسات والألوان ومكان المحل قبل أن يسأل، ويصلك منه طلب جاهز بدل عشر رسائل.
          </p>
        </div>
        <p className="mt-3 text-xs text-[var(--mute)]">تقدير تقريبي، بافتراض ثلاث دقائق لكل رد (قراءة الرسالة والتحقق والإجابة) و26 يوم عمل في الشهر.</p>
      </div>
    </div>
  );
}
