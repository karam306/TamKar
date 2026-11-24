/**
 * The hero's moving phone: the whole journey of one order, on a loop.
 * Instagram link → the store → checkout → the order lands on the merchant's WhatsApp.
 * Pure CSS (styles in app/page.tsx), so it costs nothing on a weak connection.
 * Each scene and caption gets --i (0..3); the CSS staggers them by 3.5s on a 14s loop.
 */

const products = [
  { name: "معمول بالتمر", price: "95,000", tone: "#f6d7b0", icon: "🥮" },
  { name: "بقلاوة مشكلة", price: "140,000", tone: "#e9efc9", icon: "🍯" },
  { name: "غريبة", price: "70,000", tone: "#fbe6c9", icon: "🍪" },
  { name: "كنافة", price: "120,000", tone: "#f9d9c4", icon: "🧇" },
];

export const storySteps = [
  { title: "يرى الزبون منشورك", text: "ويفتح رابط متجرك من التعريف على إنستغرام." },
  { title: "يتصفح ويختار", text: "صور وأسعار واضحة، ويضيف إلى السلة بلمسة." },
  { title: "يحدد طريقة الاستلام", text: "من المحل أو بالتوصيل، والدفع عند الاستلام." },
  { title: "يصلك الطلب منظّماً", text: "على واتساب، بالأصناف والمجموع واسم الزبون." },
];

export function StoryPhone() {
  return (
    <div className="kun-story" aria-hidden>
      <div className="kun-glow" />
      <div className="nama-phone kun-phone">
        <div className="kun-notch" />

        {/* 1. Instagram profile */}
        <div className="kun-scene" style={{ "--i": 0 } as React.CSSProperties}>
          <div className="flex items-center justify-between px-4 pb-2 pt-7 text-[13px] font-semibold text-black">
            <span dir="ltr">yasmine.sweets</span>
            <span className="text-black/40">⋯</span>
          </div>
          <div className="flex items-center gap-4 px-4 py-2">
            <span className="kun-ig-ring">
              <span className="grid h-full w-full place-items-center rounded-full bg-[#fff6ea] text-2xl">🧁</span>
            </span>
            <div className="grid flex-1 grid-cols-3 text-center text-[11px] text-black">
              <div>
                <b className="block text-sm">214</b>منشور
              </div>
              <div>
                <b className="block text-sm">8.4K</b>متابع
              </div>
              <div>
                <b className="block text-sm">96</b>يتابع
              </div>
            </div>
          </div>
          <div className="px-4 text-[12px] leading-5 text-black">
            <b>حلويات الياسمين</b>
            <div className="text-black/60">حلويات شامية طازجة كل يوم 🌿</div>
            <span className="kun-ig-link relative inline-block" dir="ltr">
              🔗 yasmine.kunstores.com
              <span className="kun-tap" style={{ insetInlineStart: "40%", top: "40%" }} />
            </span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-[2px]">
            {["#f6d7b0", "#e9efc9", "#fbe6c9", "#f9d9c4", "#e4ecd2", "#f6dcc0"].map((c, n) => (
              <div key={n} className="grid aspect-square place-items-center text-2xl" style={{ background: c }}>
                {["🥮", "🍯", "🍪", "🧇", "🎂", "🧁"][n]}
              </div>
            ))}
          </div>
        </div>

        {/* 2. The store */}
        <div className="kun-scene bg-[#fffaf4]" style={{ "--i": 1 } as React.CSSProperties}>
          <div className="flex items-center justify-between border-b border-black/5 bg-white px-4 pb-2.5 pt-7 text-black">
            <span className="text-[15px] font-bold" style={{ color: "#8d5a2b" }}>
              حلويات الياسمين
            </span>
            <span className="relative text-lg">
              🛍️
              <span className="kun-badge">2</span>
            </span>
          </div>
          <div className="mx-3 mt-3 rounded-2xl bg-[#8d5a2b] px-4 py-3 text-white">
            <div className="text-[13px] font-bold">طازجة من فرننا اليوم</div>
            <div className="text-[10.5px] text-white/80">اطلب الآن واستلم من المحل</div>
          </div>
          <div className="grid grid-cols-2 gap-2.5 p-3">
            {products.map((p, n) => (
              <div key={p.name} className="overflow-hidden rounded-xl bg-white text-black shadow-[0_1px_0_rgba(0,0,0,.05)] ring-1 ring-black/5">
                <div className="grid aspect-[4/3] place-items-center text-3xl" style={{ background: p.tone }}>
                  {p.icon}
                </div>
                <div className="p-2">
                  <div className="text-[11.5px] font-semibold">{p.name}</div>
                  <div className="mb-1.5 text-[10.5px] text-black/55">{p.price} ل.س</div>
                  <div className={`relative rounded-lg py-1 text-center text-[10.5px] font-semibold text-white ${n === 1 ? "kun-add" : ""}`} style={{ background: "#8d5a2b" }}>
                    أضف إلى السلة
                    {n === 1 && <span className="kun-tap" style={{ insetInlineStart: "45%", top: "30%" }} />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Checkout */}
        <div className="kun-scene bg-[#fffaf4] text-black" style={{ "--i": 2 } as React.CSSProperties}>
          <div className="border-b border-black/5 bg-white px-4 pb-2.5 pt-7 text-[15px] font-bold">إتمام الطلب</div>
          <div className="space-y-3 p-3 text-[12px]">
            <div className="rounded-xl bg-white p-3 ring-1 ring-black/5">
              <div className="mb-2 text-[11px] font-semibold text-black/50">طريقة الاستلام</div>
              <Radio on label="الاستلام من المحل" note="حمص، شارع الحضارة" />
              <Radio label="التوصيل إلى المنزل" />
            </div>
            <div className="rounded-xl bg-white p-3 ring-1 ring-black/5">
              <div className="mb-2 text-[11px] font-semibold text-black/50">طريقة الدفع</div>
              <Radio on label="نقداً عند الاستلام" />
              <Radio label="تحويل عبر شام كاش" />
            </div>
            <div className="flex items-center justify-between rounded-xl bg-white p-3 font-semibold ring-1 ring-black/5">
              <span>المجموع</span>
              <span>330,000 ل.س</span>
            </div>
            <div className="relative rounded-xl bg-[#25D366] py-2.5 text-center text-[13px] font-bold text-white">
              أرسل الطلب
              <span className="kun-tap" style={{ insetInlineStart: "48%", top: "35%" }} />
            </div>
          </div>
        </div>

        {/* 4. WhatsApp: the order arrives */}
        <div className="kun-scene" style={{ "--i": 3 } as React.CSSProperties}>
          <div className="flex items-center gap-2 bg-[#075E54] px-4 pb-3 pt-7 text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm">🧁</span>
            <div className="text-sm leading-tight">
              <div className="font-semibold">رنا الحسن</div>
              <div className="text-xs text-white/70">متصل الآن</div>
            </div>
          </div>
          <div className="nama-chat flex h-full flex-col gap-2 p-3">
            <div className="kun-bubble">
              <div className="mb-1 font-semibold">طلب جديد رقم #1043 من متجر حلويات الياسمين</div>
              <div>• بقلاوة مشكلة × 1 = 140,000 ل.س</div>
              <div>• معمول بالتمر × 2 = 190,000 ل.س</div>
              <div className="mt-1">طريقة الاستلام: من المحل</div>
              <div className="font-semibold">المجموع: 330,000 ل.س</div>
              <div>الدفع: عند الاستلام</div>
              <div className="mt-1 text-left text-[10px] text-black/40">9:41 ✓✓</div>
            </div>
          </div>
        </div>
      </div>

      <div className="kun-float kun-float-a">🛍️ وصل طلب جديد</div>
      <div className="kun-float kun-float-b" dir="rtl">
        <span className="text-[var(--leaf)]">+</span> 330,000 ل.س
      </div>
    </div>
  );
}

/** The four captions that light up in step with the phone. */
export function StoryCaptions() {
  return (
    <ol className="kun-caps">
      {storySteps.map((s, i) => (
        <li key={s.title} className="kun-cap" style={{ "--i": i } as React.CSSProperties}>
          <span className="kun-cap-n">{i + 1}</span>
          <div>
            <div className="font-semibold">{s.title}</div>
            <div className="text-sm leading-6 text-[var(--mute)]">{s.text}</div>
          </div>
          <span className="kun-cap-bar" />
        </li>
      ))}
    </ol>
  );
}

function Radio({ on, label, note }: { on?: boolean; label: string; note?: string }) {
  return (
    <div className="flex items-start gap-2 py-1">
      <span className={`mt-0.5 grid h-4 w-4 flex-none place-items-center rounded-full ${on ? "bg-[#8d5a2b]" : "ring-1 ring-black/25"}`}>{on && <span className="h-1.5 w-1.5 rounded-full bg-white" />}</span>
      <span>
        <span className={on ? "font-semibold" : "text-black/60"}>{label}</span>
        {note && <span className="block text-[10.5px] text-black/45">{note}</span>}
      </span>
    </div>
  );
}
