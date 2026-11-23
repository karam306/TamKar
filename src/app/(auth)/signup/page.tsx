"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { BUSINESS_TYPES } from "@/lib/business-types";
import { slugify } from "@/lib/slugify";
import { checkSlug, signup } from "../actions";

/**
 * Store setup, one question per screen. Answers are kept in this browser
 * (except the password) so a refresh doesn't lose them.
 */

const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN;
const SAVE_KEY = "tk_signup";

const TYPE_ICONS: Record<string, string> = {
  clothing: "👗",
  accessories: "💍",
  phones: "📱",
  computers: "💻",
  food: "🍰",
  beauty: "💄",
  home: "🍳",
  general: "🛍️",
};

const CITIES = ["دمشق", "ريف دمشق", "حلب", "حمص", "حماة", "اللاذقية", "طرطوس", "إدلب", "درعا", "السويداء", "دير الزور", "الرقة", "الحسكة", "القنيطرة"];
const COLORS = ["#0f5c4d", "#1d4ed8", "#c2185b", "#8d5a2b", "#7c3aed", "#d97706", "#111827", "#0e7490"];

type Data = {
  owner_name: string;
  store_name: string;
  slug: string;
  business_type: string;
  city: string;
  currency: "USD" | "SYP" | "";
  whatsapp: string;
  delivery: "yes" | "no" | "";
  delivery_fee: string;
  pickup_note: string;
  instagram: string;
  color: string;
  wants_help: "yes" | "no" | "";
  heard_from: string;
  ref: string;
  /** "1" when the visitor came through a salesman's link (signup?ref=CODE): the question is skipped. */
  ref_link: string;
  email: string;
  password: string;
};

const EMPTY: Data = {
  owner_name: "",
  store_name: "",
  slug: "",
  business_type: "",
  city: "",
  currency: "",
  whatsapp: "",
  delivery: "",
  delivery_fee: "",
  pickup_note: "",
  instagram: "",
  color: "",
  wants_help: "",
  heard_from: "",
  ref: "",
  ref_link: "",
  email: "",
  password: "",
};

type StepId =
  | "welcome"
  | "owner_name"
  | "store_name"
  | "business_type"
  | "city"
  | "currency"
  | "whatsapp"
  | "delivery"
  | "delivery_fee"
  | "pickup_note"
  | "instagram"
  | "color"
  | "wants_help"
  | "heard_from"
  | "ref_code"
  | "email"
  | "password";

const HEARD = [
  { id: "salesman", icon: "🤝", label: "زارني مندوب في المحل" },
  { id: "instagram", icon: "📸", label: "إنستغرام" },
  { id: "facebook", icon: "👍", label: "فيسبوك" },
  { id: "tiktok", icon: "🎵", label: "تيك توك" },
  { id: "friend", icon: "🗣️", label: "صديق أو تاجر آخر" },
  { id: "other", icon: "✨", label: "مصدر آخر" },
];

function stepsFor(d: Data): StepId[] {
  return [
    "welcome",
    "owner_name",
    "store_name",
    "business_type",
    "city",
    "currency",
    "whatsapp",
    "delivery",
    d.delivery === "yes" ? "delivery_fee" : "pickup_note",
    "instagram",
    "color",
    "wants_help",
    ...(d.ref_link === "1" ? [] : (["heard_from"] as StepId[])),
    ...(d.ref_link !== "1" && d.heard_from === "salesman" ? (["ref_code"] as StepId[]) : []),
    "email",
    "password",
  ];
}

export default function SignupPage() {
  const [state, action, pending] = useActionState(signup, undefined);
  const [d, setD] = useState<Data>(EMPTY);
  const [step, setStep] = useState<StepId>("welcome");
  const [problem, setProblem] = useState("");
  const [slugState, setSlugState] = useState<{ ok: boolean; reason?: string; checking?: boolean }>({ ok: false });
  const [editSlug, setEditSlug] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const loaded = useRef(false);

  const steps = stepsFor(d);
  const index = Math.max(0, steps.indexOf(step));
  const first = d.owner_name.trim().split(/\s+/)[0] ?? "";

  // Bring back answers from an earlier visit.
  useEffect(() => {
    let restored: Data = EMPTY;
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY) ?? "null");
      if (saved?.d) {
        restored = { ...EMPTY, ...saved.d, password: "" };
      }
    } catch {}
    // A salesman's personal link: signup?ref=CODE
    const ref = new URLSearchParams(window.location.search).get("ref")?.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
    if (ref) restored = { ...restored, ref, heard_from: "salesman", ref_link: "1" };
    let savedStep: StepId | null = null;
    try {
      const st = JSON.parse(localStorage.getItem(SAVE_KEY) ?? "null")?.step;
      if (st && st !== "password") savedStep = st;
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setD(restored);
    if (savedStep) setStep(savedStep);
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ d: { ...d, password: "" }, step }));
    } catch {}
  }, [d, step]);

  // Server said something is wrong: go back to that question.
  useEffect(() => {
    if (!state?.error) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProblem(state.error);
    if (state.field && (stepsFor(d) as string[]).includes(state.field)) setStep(state.field as StepId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // Check the store address while the name is typed.
  useEffect(() => {
    if (!d.slug) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSlugState({ ok: false });
      return;
    }
    let alive = true;
    setSlugState((s) => ({ ...s, checking: true }));
    const t = setTimeout(() => {
      checkSlug(d.slug).then((r) => alive && setSlugState(r));
    }, 400);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [d.slug]);

  const set = (patch: Partial<Data>) => {
    setProblem("");
    setD((x) => ({ ...x, ...patch }));
  };

  function check(id: StepId): string {
    switch (id) {
      case "owner_name":
        return d.owner_name.trim().length < 2 ? "أدخل اسمك" : "";
      case "store_name":
        if (d.store_name.trim().length < 2) return "أدخل اسم المتجر";
        if (slugState.checking) return "لحظة، جارٍ التحقق من الرابط...";
        return slugState.ok ? "" : `الرابط: ${slugState.reason ?? "غير صالح"}`;
      case "business_type":
        return d.business_type ? "" : "اختر نوع نشاطك";
      case "city":
        return d.city.trim() ? "" : "اختر المدينة";
      case "currency":
        return d.currency ? "" : "اختر العملة";
      case "whatsapp":
        return d.whatsapp.replace(/\D/g, "").length < 9 ? "أدخل رقم واتساب صحيحاً" : "";
      case "delivery":
        return d.delivery ? "" : "اختر أحد الخيارين";
      case "delivery_fee":
        return d.delivery_fee && !(Number(d.delivery_fee.replace(/,/g, "")) >= 0) ? "أدخل رقماً، أو اترك الحقل فارغاً إذا كان التوصيل مجانياً" : "";
      case "wants_help":
        return d.wants_help ? "" : "اختر أحد الخيارين";
      case "heard_from":
        return d.heard_from ? "" : "اختر أحد الخيارات";
      case "email":
        return /^\S+@\S+\.\S+$/.test(d.email.trim()) ? "" : "أدخل بريداً إلكترونياً صحيحاً";
      case "password":
        return d.password.length < 8 ? "يجب ألا تقل كلمة المرور عن 8 أحرف" : "";
      default:
        return "";
    }
  }

  function next(from: StepId = step, patch?: Partial<Data>) {
    const data = patch ? { ...d, ...patch } : d;
    const list = stepsFor(data);
    const err = patch ? "" : check(from);
    if (err) return setProblem(err);
    setProblem("");
    const i = list.indexOf(from);
    if (i === list.length - 1) {
      try {
        localStorage.removeItem(SAVE_KEY);
      } catch {}
      formRef.current?.requestSubmit();
      return;
    }
    setStep(list[i + 1]);
  }

  /** Pick an answer and move on (for questions answered with one tap). */
  function choose(patch: Partial<Data>) {
    set(patch);
    setTimeout(() => next(step, patch), 180);
  }

  function back() {
    setProblem("");
    if (index > 0) setStep(steps[index - 1]);
  }

  const link = root ? `${d.slug || "mystore"}.${root}` : `kunstores.com/s/${d.slug || "mystore"}`;
  const progress = Math.round((index / (steps.length - 1)) * 100);

  return (
    <div className="flex min-h-[420px] flex-col">
      {/* All answers go to the server in one go at the end. */}
      <form ref={formRef} action={action} className="hidden">
        {Object.entries(d).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
      </form>

      {step !== "welcome" && (
        <div className="mb-6 flex items-center gap-3">
          <button type="button" onClick={back} className="text-xl text-muted hover:text-text" aria-label="رجوع">
            →
          </button>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface">
            <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-xs text-muted">
            {index}/{steps.length - 1}
          </span>
        </div>
      )}

      <div key={step} className="flex flex-1 flex-col" style={{ animation: "tkfade .25s ease-out" }}>
        <style>{`@keyframes tkfade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>

        {step === "welcome" && (
          <Screen title="أهلاً بك" sub="سنجهّز لك متجراً إلكترونياً في دقيقتين. سنطرح عليك بعض الأسئلة، سؤالاً تلو الآخر.">
            <ul className="space-y-2 text-sm text-muted">
              <li>✓ تجربة مجانية لمدة 14 يوماً، دون بطاقة</li>
              <li>✓ تصلك الطلبات عبر واتساب</li>
              <li>✓ الدفع عند الاستلام، دون دفع إلكتروني</li>
            </ul>
            <Next onClick={() => next()} label="لنبدأ" />
            <p className="mt-4 text-center text-sm text-muted">
              لديك متجر؟{" "}
              <Link href="/login" className="text-primary">
                سجّل الدخول
              </Link>
            </p>
          </Screen>
        )}

        {step === "owner_name" && (
          <Screen title="ما اسمك؟" sub="لنعرف مع من نتحدث.">
            <TextInput value={d.owner_name} onChange={(v) => set({ owner_name: v })} onEnter={() => next()} placeholder="مثلاً: أحمد" autoComplete="name" />
            <Next onClick={() => next()} />
          </Screen>
        )}

        {step === "store_name" && (
          <Screen title={first ? `تشرّفنا يا ${first}. ما اسم متجرك؟` : "ما اسم متجرك؟"} sub="الاسم الذي يعرفك به زبائنك.">
            <TextInput
              value={d.store_name}
              onChange={(v) => set({ store_name: v, ...(editSlug ? {} : { slug: slugify(v) }) })}
              onEnter={() => next()}
              placeholder="مثلاً: بيت المطبخ"
            />
            {d.store_name.trim().length > 1 && (
              <div className="mt-3 rounded-theme bg-surface p-3 text-sm">
                <div className="text-muted">سيكون رابط متجرك:</div>
                {editSlug ? (
                  <input
                    value={d.slug}
                    onChange={(e) => set({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                    dir="ltr"
                    className="input mt-1"
                    placeholder="mystore"
                  />
                ) : (
                  <bdi dir="ltr" className="block font-semibold">
                    {link}
                  </bdi>
                )}
                <div className="mt-1 flex items-center justify-between text-xs">
                  <span className={slugState.checking ? "text-muted" : slugState.ok ? "text-green-700" : "text-red-700"}>
                    {slugState.checking ? "جارٍ التحقق..." : slugState.ok ? "✓ متاح" : slugState.reason}
                  </span>
                  {!editSlug && (
                    <button type="button" className="text-primary underline" onClick={() => setEditSlug(true)}>
                      تغيير الرابط
                    </button>
                  )}
                </div>
              </div>
            )}
            <Next onClick={() => next()} />
          </Screen>
        )}

        {step === "business_type" && (
          <Screen title="ماذا تبيع؟" sub="سنجهّز لك متجراً يناسب نشاطك، بأقسام وخيارات جاهزة.">
            <div className="grid grid-cols-2 gap-2">
              {BUSINESS_TYPES.map((b) => (
                <Choice key={b.id} selected={d.business_type === b.id} onClick={() => choose({ business_type: b.id })}>
                  <span className="text-2xl">{TYPE_ICONS[b.id]}</span>
                  <span className="text-sm">{b.label}</span>
                </Choice>
              ))}
            </div>
          </Screen>
        )}

        {step === "city" && (
          <Screen title="أين يقع محلك؟" sub="المدينة التي يقع فيها محلك أو التي تعمل منها.">
            <div className="flex flex-wrap gap-2">
              {CITIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => choose({ city: c })}
                  className={`rounded-full border px-3 py-1.5 text-sm ${d.city === c ? "border-primary bg-primary text-white" : "border-black/15 hover:border-primary"}`}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="mt-3">
              <TextInput
                value={CITIES.includes(d.city) ? "" : d.city}
                onChange={(v) => set({ city: v })}
                onEnter={() => next()}
                placeholder="أو اكتب مدينة أخرى"
                autoFocus={false}
              />
            </div>
            <Next onClick={() => next()} />
          </Screen>
        )}

        {step === "currency" && (
          <Screen title="بأي عملة تسعّر منتجاتك؟" sub="يمكنك تغييرها لاحقاً من الإعدادات.">
            <div className="grid grid-cols-2 gap-2">
              <Choice selected={d.currency === "USD"} onClick={() => choose({ currency: "USD" })}>
                <span className="text-2xl">$</span>
                <span className="text-sm">دولار</span>
              </Choice>
              <Choice selected={d.currency === "SYP"} onClick={() => choose({ currency: "SYP" })}>
                <span className="text-2xl">ل.س</span>
                <span className="text-sm">ليرة سورية</span>
              </Choice>
            </div>
          </Screen>
        )}

        {step === "whatsapp" && (
          <Screen title="ما رقم واتساب الخاص بك؟" sub="ستصلك عليه رسالة بكل طلب جديد.">
            <TextInput
              value={d.whatsapp}
              onChange={(v) => set({ whatsapp: v.replace(/[^\d+\s]/g, "") })}
              onEnter={() => next()}
              placeholder="0933123456"
              inputMode="tel"
              dir="ltr"
              autoComplete="tel"
            />
            <Next onClick={() => next()} />
          </Screen>
        )}

        {step === "delivery" && (
          <Screen title="هل لديك خدمة توصيل؟" sub="إن لم تكن لديك، يطلب الزبون عبر الإنترنت ويستلم طلبه من محلك.">
            <div className="grid grid-cols-2 gap-2">
              <Choice selected={d.delivery === "no"} onClick={() => choose({ delivery: "no" })}>
                <span className="text-2xl">🏪</span>
                <span className="text-sm">لا، الاستلام من المحل</span>
              </Choice>
              <Choice selected={d.delivery === "yes"} onClick={() => choose({ delivery: "yes" })}>
                <span className="text-2xl">🚚</span>
                <span className="text-sm">نعم، لدي توصيل</span>
              </Choice>
            </div>
            <p className="mt-3 text-xs text-muted">في جميع الأحوال، يبقى الاستلام من المحل متاحاً للزبون.</p>
          </Screen>
        )}

        {step === "delivery_fee" && (
          <Screen title="ما رسوم التوصيل؟" sub={`سعر موحّد لجميع الطلبات، ويمكنك لاحقاً تحديد سعر لكل مدينة. اترك الحقل فارغاً إذا كان التوصيل مجانياً.`}>
            <div className="flex items-center gap-2">
              <TextInput
                value={d.delivery_fee}
                onChange={(v) => set({ delivery_fee: v.replace(/[^\d.,]/g, "") })}
                onEnter={() => next()}
                placeholder="0"
                inputMode="decimal"
                dir="ltr"
              />
              <span className="text-muted">{d.currency === "SYP" ? "ل.س" : "$"}</span>
            </div>
            <Next onClick={() => next()} />
          </Screen>
        )}

        {step === "pickup_note" && (
          <Screen title="أين يستلم الزبون طلبه؟" sub="العنوان وأوقات الاستلام، وتظهر للزبون عند الطلب.">
            <TextInput
              value={d.pickup_note}
              onChange={(v) => set({ pickup_note: v })}
              onEnter={() => next()}
              placeholder={`مثلاً: ${d.city || "حمص"}، شارع الحضارة، من 10 صباحاً حتى 9 مساءً`}
            />
            <Next onClick={() => next()} />
            <Skip onClick={() => next()} />
          </Screen>
        )}

        {step === "instagram" && (
          <Screen title="هل لديك حساب على إنستغرام؟" sub="سنضع رابطه في متجرك. اكتب اسم الحساب فقط.">
            <div className="flex items-center gap-2" dir="ltr">
              <span className="text-muted">@</span>
              <TextInput value={d.instagram} onChange={(v) => set({ instagram: v.replace(/[^a-zA-Z0-9._]/g, "") })} onEnter={() => next()} placeholder="mystore" dir="ltr" />
            </div>
            <Next onClick={() => next()} />
            <Skip onClick={() => (set({ instagram: "" }), next(step, { instagram: "" }))} label="ليس لدي" />
          </Screen>
        )}

        {step === "color" && (
          <Screen title="ما اللون الذي يناسب متجرك؟" sub="لون الأزرار والعناوين، ويمكنك تغييره لاحقاً.">
            <div className="grid grid-cols-4 gap-3">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => choose({ color: c })}
                  aria-label={c}
                  className={`aspect-square rounded-theme transition ${d.color === c ? "ring-4 ring-black/20 ring-offset-2" : "hover:scale-105"}`}
                  style={{ background: c }}
                />
              ))}
            </div>
            <Skip onClick={() => next(step, { color: "" })} label="اختاروا لي" />
          </Screen>
        )}

        {step === "wants_help" && (
          <Screen title="هل تريد مساعدتنا؟" sub="يمكن لفريقنا إضافة منتجاتك، وتجهيز متجرك، وإدارة إعلانات فيسبوك وإنستغرام لتصلك بالزبائن.">
            <div className="grid gap-2">
              <Choice selected={d.wants_help === "yes"} onClick={() => choose({ wants_help: "yes" })} row>
                <span className="text-2xl">🙋</span>
                <span className="text-right text-sm">
                  <b className="block">نعم، تواصلوا معي</b>
                  <span className="text-muted">سنتواصل معك عبر واتساب خلال يوم</span>
                </span>
              </Choice>
              <Choice selected={d.wants_help === "no"} onClick={() => choose({ wants_help: "no" })} row>
                <span className="text-2xl">💪</span>
                <span className="text-right text-sm">
                  <b className="block">لا، سأجهّزه بنفسي</b>
                  <span className="text-muted">يمكنك طلب المساعدة في أي وقت</span>
                </span>
              </Choice>
            </div>
          </Screen>
        )}

        {step === "heard_from" && (
          <Screen title="كيف عرفت بمنصة كُن؟" sub="يساعدنا ذلك على الوصول إلى تجار مثلك.">
            <div className="grid grid-cols-2 gap-2">
              {HEARD.map((h) => (
                <Choice key={h.id} selected={d.heard_from === h.id} onClick={() => choose({ heard_from: h.id })}>
                  <span className="text-2xl">{h.icon}</span>
                  <span className="text-sm">{h.label}</span>
                </Choice>
              ))}
            </div>
          </Screen>
        )}

        {step === "ref_code" && (
          <Screen title="رمز المندوب" sub="يعطيك المندوب رمزاً قصيراً. إن لم تكن تعرفه، يمكنك التخطي.">
            <TextInput value={d.ref} onChange={(v) => set({ ref: v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12) })} onEnter={() => next()} placeholder="مثلاً: SAMER123" dir="ltr" autoComplete="off" />
            <Next onClick={() => next()} />
            <Skip onClick={() => next(step, { ref: "" })} label="لا أعرفه" />
          </Screen>
        )}

        {step === "email" && (
          <Screen title="أخيراً: بريدك الإلكتروني" sub="ستستخدمه لتسجيل الدخول إلى لوحة تحكم متجرك.">
            <TextInput value={d.email} onChange={(v) => set({ email: v.trim() })} onEnter={() => next()} placeholder="name@gmail.com" inputMode="email" dir="ltr" autoComplete="email" />
            <Next onClick={() => next()} />
          </Screen>
        )}

        {step === "password" && (
          <Screen title="اختر كلمة مرور" sub="8 أحرف على الأقل.">
            <div className="relative">
              <TextInput
                value={d.password}
                onChange={(v) => set({ password: v })}
                onEnter={() => next()}
                type={showPw ? "text" : "password"}
                dir="ltr"
                autoComplete="new-password"
              />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted">
                {showPw ? "إخفاء" : "إظهار"}
              </button>
            </div>
            <Next onClick={() => next()} label={pending ? "جارٍ تجهيز متجرك..." : "أنشئ متجري"} disabled={pending} />
            <p className="mt-3 text-center text-xs text-muted">بالضغط على الزر، فإنك توافق على شروط الاستخدام.</p>
          </Screen>
        )}

        {problem && <p className="mt-3 rounded-theme bg-red-50 p-3 text-sm text-red-700">{problem}</p>}
      </div>
    </div>
  );
}

function Screen({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <h1 className="text-2xl leading-snug">{title}</h1>
      {sub && <p className="mb-5 mt-1 text-sm text-muted">{sub}</p>}
      {!sub && <div className="mb-5" />}
      {children}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  onEnter,
  autoFocus = true,
  ...rest
}: {
  value: string;
  onChange: (v: string) => void;
  onEnter: () => void;
  autoFocus?: boolean;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <input
      {...rest}
      value={value}
      autoFocus={autoFocus}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onEnter();
        }
      }}
      className="input w-full !py-3 text-lg"
    />
  );
}

function Choice({ selected, onClick, children, row }: { selected: boolean; onClick: () => void; children: React.ReactNode; row?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex ${row ? "flex-row gap-3" : "flex-col gap-1"} items-center rounded-theme border-2 p-3 transition ${selected ? "border-primary bg-surface" : "border-black/10 hover:border-primary/50"}`}
    >
      {children}
    </button>
  );
}

function Next({ onClick, label = "التالي", disabled }: { onClick: () => void; label?: string; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="btn mt-6 w-full !py-3 text-base">
      {label}
    </button>
  );
}

function Skip({ onClick, label = "تخطٍّ" }: { onClick: () => void; label?: string }) {
  return (
    <button type="button" onClick={onClick} className="mt-2 w-full py-2 text-sm text-muted hover:text-text">
      {label}
    </button>
  );
}
