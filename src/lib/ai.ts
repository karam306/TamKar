import "server-only";
import sharp from "sharp";
import { isPro } from "./plans";
import { MEDIA_BUCKET, supabaseAdmin } from "./supabase";

/**
 * Kun's AI helpers (Claude). Every call is one short request made when the
 * merchant presses a button, never on storefront visits, so the cost stays tiny.
 * Usage is counted per store per month in ai_usage (update 017).
 */
const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-5-5";

export const AI_LIMITS = { basic: 50, pro: 500 };
export const aiLimit = (s: { plan?: string | null }) => (isPro(s) ? AI_LIMITS.pro : AI_LIMITS.basic);

/** The voice every text must follow (same rules as the platform's tone guide). */
export const VOICE = `اكتب بالعربية الفصحى الهادئة الرسمية، بجمل قصيرة وواضحة.
لا لهجة عامية، ولا مبالغة أو كلمات دعائية (الأفضل، الأروع، لا يفوتك)، ولا علامات تعجب، ولا إلحاح أو عدّ تنازلي، ولا رموز تعبيرية داخل النص، ولا شرطات طويلة.
لا تخترع أي معلومة غير موجودة في الصورة أو فيما كتبه التاجر: لا أسعار ولا أوزان ولا مقاسات ولا ضمانات ولا مدد توصيل ولا جوائز. إذا لم تعرف معلومة فاتركها.`;

export class AiError extends Error {}

type Img = { data: string; media_type: "image/jpeg" };

/** Requests used this calendar month. */
export async function aiUsed(storeId: string): Promise<number> {
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  const { count, error } = await supabaseAdmin()
    .from("ai_usage")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId)
    .gte("created_at", start.toISOString());
  if (error) return 0; // table missing: don't block the merchant
  return count ?? 0;
}

export async function aiLeft(store: { id: string; plan?: string | null }) {
  return Math.max(0, aiLimit(store) - (await aiUsed(store.id)));
}

/** A photo the merchant just picked (from a form), shrunk for the model. */
export async function imageFromFile(file: File | null): Promise<Img> {
  if (!file || file.size === 0) throw new AiError("اختر صورة");
  if (file.size > 6 * 1024 * 1024) throw new AiError("حجم الصورة كبير جداً");
  return toJpeg(Buffer.from(await file.arrayBuffer()), 1568);
}

/** A picture already saved in this store's media (/api/media/<storeId>/...). */
export async function imageFromMedia(storeId: string, url: string): Promise<Img> {
  if (!url.startsWith(`/api/media/${storeId}/`)) throw new AiError("الصورة غير صالحة");
  const path = url.replace("/api/media/", "");
  const { data, error } = await supabaseAdmin().storage.from(MEDIA_BUCKET).download(path);
  if (error || !data) throw new AiError("تعذّرت قراءة الصورة");
  return toJpeg(Buffer.from(await data.arrayBuffer()), 1024);
}

async function toJpeg(input: Buffer, max: number): Promise<Img> {
  try {
    const out = await sharp(input, { limitInputPixels: 60_000_000 })
      .rotate()
      .resize({ width: max, height: max, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 82 })
      .toBuffer();
    return { data: out.toString("base64"), media_type: "image/jpeg" };
  } catch {
    throw new AiError("تعذّرت قراءة الصورة، جرّب صورة أخرى");
  }
}

/**
 * One request to Claude that must answer through a tool with this JSON schema,
 * so the result is always structured. Counts one use for the store.
 */
export async function aiCall<T>(opts: {
  store: { id: string; plan?: string | null };
  kind: "product" | "price_list" | "store" | "invoice";
  system: string;
  text: string;
  images?: Img[];
  tool: { name: string; description: string; schema: Record<string, unknown> };
  maxTokens?: number;
}): Promise<{ data: T; left: number }> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new AiError("ميزة الذكاء الاصطناعي غير مفعّلة حالياً");

  const limit = aiLimit(opts.store);
  const used = await aiUsed(opts.store.id);
  if (used >= limit)
    throw new AiError(
      isPro(opts.store)
        ? `استخدمت ${limit} طلباً هذا الشهر، وهو الحد الأقصى. يتجدد الرصيد في أول الشهر.`
        : `استخدمت ${limit} طلباً هذا الشهر، وهو حد الباقة الأساسية. رقِّ إلى الباقة الاحترافية لرصيد أكبر.`,
    );

  const content = [
    ...(opts.images ?? []).map((i) => ({ type: "image", source: { type: "base64", ...i } })),
    { type: "text", text: opts.text },
  ];

  let res: Response;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: opts.maxTokens ?? 2000,
        system: opts.system,
        tools: [{ name: opts.tool.name, description: opts.tool.description, input_schema: opts.tool.schema }],
        tool_choice: { type: "tool", name: opts.tool.name },
        messages: [{ role: "user", content }],
      }),
      signal: AbortSignal.timeout(90_000),
    });
  } catch {
    throw new AiError("تعذّر الاتصال بخدمة الذكاء الاصطناعي، حاول مرة أخرى");
  }
  if (!res.ok) {
    console.error("[ai]", res.status, (await res.text()).slice(0, 500));
    throw new AiError(res.status === 429 || res.status === 529 ? "الخدمة مشغولة الآن، حاول بعد دقيقة" : "حدث خطأ في خدمة الذكاء الاصطناعي، حاول مرة أخرى");
  }
  const body = (await res.json()) as { content?: { type: string; input?: unknown }[]; stop_reason?: string };
  const block = body.content?.find((b) => b.type === "tool_use");
  if (!block?.input) throw new AiError("لم تصل إجابة مفهومة، حاول مرة أخرى");

  await supabaseAdmin().from("ai_usage").insert({ store_id: opts.store.id, kind: opts.kind });
  return { data: block.input as T, left: Math.max(0, limit - used - 1) };
}

export const aiMessage = (e: unknown) => (e instanceof AiError ? e.message : "حدث خطأ، حاول مرة أخرى");
