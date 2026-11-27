"use server";

import { refresh, revalidatePath } from "next/cache";
import { aiCall, aiMessage, VOICE } from "@/lib/ai";
import { requireAccess } from "@/lib/auth";
import { cleanSections } from "@/lib/clean-sections";
import type { Section, Store } from "@/lib/types";

export type StoreDraft = {
  tagline: string;
  color: string;
  announcement: string;
  hero: { title: string; subtitle: string; buttonText: string };
  features: { icon: string; title: string; text: string }[];
  faq: { q: string; a: string }[];
  cta: { title: string; text: string };
  about: string;
  shipping: string;
  returns: string;
};

const WALLETS: Record<string, string> = { sham_cash: "شام كاش", syriatel_cash: "سيريتل كاش", mtn_cash: "MTN كاش" };

/** What we know for sure about the store, so the texts never invent delivery fees or payment methods. */
function facts(store: Store) {
  const s = store.shipping ?? {};
  const cur = store.currency === "SYP" ? "ليرة سورية" : "دولار";
  const n = (v: number) => v.toLocaleString("en-US");
  const lines = [`اسم المتجر: ${store.name}`, store.city ? `المدينة: ${store.city}` : "", `العملة: ${cur}`];
  if (s.delivery === false) lines.push(`لا يوجد توصيل، الاستلام من المحل.${s.pickup_note ? ` ${s.pickup_note}` : ""}`);
  else {
    const rates = (s.rates ?? []).map((r) => `${r.city}: ${n(r.fee)} ${cur}`);
    if (rates.length) lines.push(`أجور التوصيل: ${rates.join("، ")}`);
    if (s.default_fee != null) lines.push(`أجرة التوصيل لباقي المناطق: ${n(s.default_fee)} ${cur}`);
    if (s.free_over) lines.push(`التوصيل مجاني للطلبات التي تتجاوز ${n(s.free_over)} ${cur}`);
    if (!rates.length && s.default_fee == null) lines.push("يوجد توصيل، والأجرة تُحدَّد عند تأكيد الطلب.");
  }
  const pays = [s.payments?.cod !== false ? "الدفع نقداً عند الاستلام" : "", ...(s.payments?.wallets ?? []).map((w) => WALLETS[w.id] ?? "")].filter(Boolean);
  lines.push(`طرق الدفع: ${pays.join("، ")}`);
  lines.push("تُرسَل الطلبات عبر واتساب، ويتواصل المتجر مع الزبون لتأكيد الطلب.");
  return lines.filter(Boolean).join("\n");
}

/** Drafts the store's texts from the merchant's own description. Nothing is saved yet. */
export async function aiDraftStore(description: string): Promise<{ draft?: StoreDraft; left?: number; error?: string }> {
  const { store, db } = await requireAccess("design");
  const desc = String(description ?? "").trim().slice(0, 1500);
  if (desc.length < 10) return { error: "اكتب جملة أو جملتين عن متجرك: ماذا تبيع، ولمن، وما الذي يميزك" };

  const { data: products } = await db.from("products").select("title, category").eq("store_id", store.id).eq("active", true).limit(30);
  const list = (products ?? []).map((p) => p.title as string).join("، ");

  try {
    const { data, left } = await aiCall<StoreDraft>({
      store,
      kind: "store",
      system: `أنت تكتب نصوص المتاجر الإلكترونية لتجار سوريين على منصة كُن.\n${VOICE}\nاستخدم المعلومات المؤكدة كما هي حرفياً، ولا تذكر أي سعر أو مدة أو طريقة دفع غير مذكورة فيها.`,
      text: `وصف التاجر لمتجره:\n${desc}\n\nمعلومات مؤكدة:\n${facts(store)}${list ? `\n\nبعض المنتجات: ${list}` : ""}

اكتب:
- tagline: عبارة قصيرة تحت اسم المتجر (حتى 8 كلمات).
- color: لون أساسي هادئ يناسب نوع النشاط بصيغة #rrggbb، غامق بما يكفي ليُقرأ عليه نص أبيض.
- announcement: سطر واحد للشريط العلوي من المعلومات المؤكدة (مثل التوصيل المجاني أو طريقة الدفع).
- hero: عنوان رئيسي (حتى 7 كلمات)، وسطر تعريفي (حتى 20 كلمة)، ونص زر (كلمتان).
- features: أربع ميزات حقيقية من الوصف والمعلومات المؤكدة، لكل منها رمز تعبيري واحد، وعنوان من كلمتين أو ثلاث، وسطر قصير.
- faq: من 4 إلى 6 أسئلة يسألها الزبائن فعلاً عن هذا النوع من المتاجر، وأجوبتها من المعلومات المؤكدة فقط. لا تكتب سؤالاً لا تعرف جوابه.
- cta: عنوان ونص قصير يدعو الزبون إلى مراسلة المتجر على واتساب.
- about: صفحة "من نحن" من فقرتين أو ثلاث، من وصف التاجر فقط.
- shipping: صفحة "التوصيل والدفع" من المعلومات المؤكدة فقط، بفقرات قصيرة.
- returns: صفحة "الإرجاع والاستبدال" قصيرة تناسب نوع المنتجات (المواد الغذائية الطازجة مثلاً لا تُرجع إلا إن وصلت تالفة). لا تذكر مدة أو استرداد مال إلا إن ذكره التاجر، واطلب من الزبون مراسلة المتجر على واتساب.
في الصفحات افصل الفقرات بسطر فارغ، ويمكن أن يبدأ العنوان الفرعي بـ "## ".`,
      tool: {
        name: "store_texts",
        description: "نصوص المتجر",
        schema: {
          type: "object",
          properties: {
            tagline: { type: "string" },
            color: { type: "string" },
            announcement: { type: "string" },
            hero: { type: "object", properties: { title: { type: "string" }, subtitle: { type: "string" }, buttonText: { type: "string" } }, required: ["title", "subtitle", "buttonText"] },
            features: { type: "array", items: { type: "object", properties: { icon: { type: "string" }, title: { type: "string" }, text: { type: "string" } }, required: ["icon", "title", "text"] } },
            faq: { type: "array", items: { type: "object", properties: { q: { type: "string" }, a: { type: "string" } }, required: ["q", "a"] } },
            cta: { type: "object", properties: { title: { type: "string" }, text: { type: "string" } }, required: ["title", "text"] },
            about: { type: "string" },
            shipping: { type: "string" },
            returns: { type: "string" },
          },
          required: ["tagline", "color", "announcement", "hero", "features", "faq", "cta", "about", "shipping", "returns"],
        },
      },
      maxTokens: 4000,
    });
    return { draft: cleanDraft(data), left };
  } catch (e) {
    return { error: aiMessage(e) };
  }
}

const t = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

function cleanDraft(d: Partial<StoreDraft>): StoreDraft {
  const color = t(d?.color, 7);
  return {
    tagline: t(d?.tagline, 120),
    color: /^#[0-9a-fA-F]{6}$/.test(color) ? color : "",
    announcement: t(d?.announcement, 120),
    hero: { title: t(d?.hero?.title, 100), subtitle: t(d?.hero?.subtitle, 200), buttonText: t(d?.hero?.buttonText, 30) },
    features: (Array.isArray(d?.features) ? d.features : []).slice(0, 4).map((f) => ({ icon: t(f?.icon, 8), title: t(f?.title, 40), text: t(f?.text, 80) })).filter((f) => f.title),
    faq: (Array.isArray(d?.faq) ? d.faq : []).slice(0, 8).map((f) => ({ q: t(f?.q, 200), a: t(f?.a, 1000) })).filter((f) => f.q && f.a),
    cta: { title: t(d?.cta?.title, 80), text: t(d?.cta?.text, 200) },
    about: t(d?.about, 5000),
    shipping: t(d?.shipping, 5000),
    returns: t(d?.returns, 5000),
  };
}

/** Puts the approved draft into the store: replaces the texts, keeps every picture, product list and custom section. */
export async function aiApplyStore(input: StoreDraft): Promise<{ ok?: string; error?: string }> {
  const { store, db } = await requireAccess("design");
  const d = cleanDraft(input);
  const current: Section[] = store.sections ?? [];
  const find = <K extends Section["type"]>(type: K) => current.find((s) => s.type === type) as Extract<Section, { type: K }> | undefined;

  const hero = find("hero");
  const out: Section[] = [];
  if (d.announcement) out.push({ type: "announcement", text: d.announcement });
  out.push({ type: "hero", ...d.hero, image: hero?.image });
  if (d.features.length) out.push({ type: "features", items: d.features });
  // Everything else the merchant built stays, in the same order.
  for (const s of current) if (!["announcement", "hero", "features", "faq", "whatsapp_cta"].includes(s.type)) out.push(s);
  if (d.faq.length) out.push({ type: "faq", title: find("faq")?.title || "أسئلة شائعة", items: d.faq });
  out.push({ type: "whatsapp_cta", title: d.cta.title, text: d.cta.text });

  const { error } = await db
    .from("stores")
    .update({
      sections: cleanSections(out, store.id),
      ...(d.tagline ? { tagline: d.tagline } : {}),
      ...(d.color ? { primary_color: d.color } : {}),
    })
    .eq("id", store.id);
  if (error) return { error: "تعذّر الحفظ، حاول مرة أخرى" };

  const pages = [
    { handle: "about", title: "من نحن", body: d.about },
    { handle: "shipping", title: "التوصيل والدفع", body: d.shipping },
    { handle: "returns", title: "سياسة الإرجاع والاستبدال", body: d.returns },
  ].filter((p) => p.body);
  for (const p of pages) {
    await db.from("pages").upsert({ store_id: store.id, ...p, published: true }, { onConflict: "store_id,handle" });
  }

  revalidatePath("/dashboard", "layout");
  refresh();
  return { ok: "✓ طُبّقت النصوص على متجرك. راجعها من المحرر أدناه، وعدّل ما تريد." };
}
