"use server";

import { refresh, revalidatePath } from "next/cache";
import { aiCall, aiMessage, imageFromFile, imageFromMedia } from "@/lib/ai";
import { requireAccess, requireOwner } from "@/lib/auth";
import { txt } from "@/lib/clean-product";
import { LIMIT_MSG, productRoom } from "@/lib/plan-guard";
import { syncCatalogLater } from "@/lib/meta-managed";

export type AiProduct = { title: string; description: string; category: string; specs: { name: string; value: string }[] };

/** Writes the title, description, type and details of a product from its photo and the merchant's notes. */
export async function aiDescribeProduct(input: {
  image?: string;
  title?: string;
  hint?: string;
  categories?: string[];
}): Promise<{ data?: AiProduct; left?: number; error?: string }> {
  const { store } = await requireAccess("products");
  const title = txt(input.title, 200);
  const hint = txt(input.hint, 500);
  const cats = (input.categories ?? []).map((c) => txt(c, 40)).filter(Boolean).slice(0, 40);
  if (!input.image && !title && !hint) return { error: "ارفع صورة للمنتج أولاً، أو اكتب اسمه" };

  try {
    const images = input.image ? [await imageFromMedia(store.id, input.image)] : [];
    const { data, left } = await aiCall<AiProduct>({
      store,
      kind: "product",
      system: `أنت كاتب محتوى في متجر إلكتروني سوري اسمه "${store.name}"، تكتب بطاقات المنتجات بصوت المتجر موجّهاً إلى الزبون.
اكتب بالعربية الفصحى الهادئة، بجمل قصيرة، دون مبالغة أو علامات تعجب أو رموز تعبيرية أو شرطات طويلة.

قواعد صارمة:
- حدّد المنتج نفسه: نوعه، وماركته وطرازه إن كانا واضحين في الصورة أو في كلام التاجر. احتفظ باسم الماركة والطراز كما يُكتبان عادة (مثل Apple Magic Mouse).
- صف المنتج وفائدته للزبون، لا الصورة. لا تذكر الخلفية أو الطاولة أو الإضاءة، ولا تستخدم عبارات مثل "تظهر في الصورة" أو "كما في الصورة".
- لا تتحدث عن التاجر ولا عن المعلومات الناقصة. لا تكتب "لم يذكر التاجر" أو "لا تتوفر معلومات". إذا لم تعرف شيئاً فلا تذكره أصلاً.
- إذا عرفت المنتج بثقة (طراز معروف)، يمكنك ذكر ميزاته المعروفة العامة. لا تذكر السعر أو الحالة (جديد أو مستعمل) أو الضمان أو مدة التوصيل إلا إن ذكرها التاجر.
- إن لم تتعرف على الماركة، فاكتب وصفاً عاماً لنوع المنتج وشكله ولونه واستخدامه.`,
      images,
      text: [
        images.length ? "صورة المنتج مرفقة." : "",
        title && `اسم المنتج كما كتبه التاجر: ${title}`,
        hint && `معلومات من التاجر: ${hint}`,
        cats.length ? `أنواع المنتجات الموجودة في المتجر: ${cats.join("، ")}. اختر منها إن كان أحدها مناسباً.` : "",
        `اكتب:
- title: اسم المنتج كما يبحث عنه الزبون، قصيراً (مثال: "فأرة Apple Magic Mouse لاسلكية، أبيض").
- description: فقرتان قصيرتان، بين 35 و70 كلمة: الأولى تعرّف بالمنتج، والثانية تذكر لمن يناسب أو كيف يُستخدم.
- category: نوع المنتج بكلمة أو كلمتين.
- specs: من 0 إلى 5 أسطر لمعلومات مؤكدة فقط (الماركة، اللون، الاتصال، المادة، الوزن إن ذُكر).`,
      ]
        .filter(Boolean)
        .join("\n"),
      tool: {
        name: "product_card",
        description: "بطاقة المنتج",
        schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            category: { type: "string" },
            specs: { type: "array", items: { type: "object", properties: { name: { type: "string" }, value: { type: "string" } }, required: ["name", "value"] } },
          },
          required: ["title", "description", "category", "specs"],
        },
      },
      maxTokens: 1200,
    });
    return {
      left,
      data: {
        title: txt(data.title, 200),
        description: txt(data.description, 5000),
        category: txt(data.category, 40),
        specs: (Array.isArray(data.specs) ? data.specs : [])
          .map((s) => ({ name: txt(s?.name, 40), value: txt(s?.value, 200) }))
          .filter((s) => s.name && s.value)
          .slice(0, 8),
      },
    };
  } catch (e) {
    return { error: aiMessage(e) };
  }
}

export type ListItem = { title: string; price: number | null; category: string };

/** Reads a photo of a price list (paper, board, screenshot) into product rows for review. */
export async function aiReadPriceList(form: FormData): Promise<{ items?: ListItem[]; left?: number; error?: string }> {
  const { store } = await requireOwner();
  try {
    const image = await imageFromFile(form.get("file") as File | null);
    const { data, left } = await aiCall<{ items: ListItem[] }>({
      store,
      kind: "price_list",
      system: `أنت تقرأ قوائم الأسعار لمتجر سوري اسمه "${store.name}"، وتحوّلها إلى قائمة منتجات.\nانقل أسماء المنتجات كما هي مكتوبة مع تصحيح الإملاء فقط، ولا تخترع منتجات أو أسعاراً.`,
      images: [image],
      text: `اقرأ كل المنتجات وأسعارها من هذه الصورة. عملة المتجر ${store.currency === "SYP" ? "الليرة السورية" : "الدولار الأمريكي"}.
- السعر رقم فقط دون فواصل أو عملة. إذا كُتب "45 ألف" فالسعر 45000. إذا لم يُقرأ السعر بوضوح فاجعله null.
- إذا كانت القائمة مقسّمة إلى عناوين (مثل: حلويات، مشروبات) فضع العنوان في category، وإلا فاتركه فارغاً.
- تجاهل أرقام الهواتف والعناوين والتواريخ.`,
      tool: {
        name: "price_list",
        description: "المنتجات المقروءة من القائمة",
        schema: {
          type: "object",
          properties: {
            items: {
              type: "array",
              items: {
                type: "object",
                properties: { title: { type: "string" }, price: { type: ["number", "null"] }, category: { type: "string" } },
                required: ["title", "price", "category"],
              },
            },
          },
          required: ["items"],
        },
      },
      maxTokens: 8000,
    });
    const items = (Array.isArray(data.items) ? data.items : [])
      .map((i) => ({
        title: txt(i?.title, 200),
        price: typeof i?.price === "number" && Number.isFinite(i.price) && i.price >= 0 ? i.price : null,
        category: txt(i?.category, 40),
      }))
      .filter((i) => i.title)
      .slice(0, 300);
    if (!items.length) return { error: "لم أجد منتجات في الصورة. جرّب صورة أوضح للقائمة.", left };
    return { items, left };
  } catch (e) {
    return { error: aiMessage(e) };
  }
}

/** Adds the reviewed rows as products (no photos yet). */
export async function addListedProducts(rows: ListItem[]): Promise<{ ok?: string; error?: string }> {
  const { store, db } = await requireOwner();
  const clean = (Array.isArray(rows) ? rows : [])
    .map((r) => ({ title: txt(r?.title, 200), price: Number(r?.price), category: txt(r?.category, 40) }))
    .filter((r) => r.title && Number.isFinite(r.price) && r.price >= 0)
    .slice(0, 300);
  if (!clean.length) return { error: "لا توجد منتجات بأسعار صحيحة لإضافتها" };

  const room = await productRoom(db, store);
  if (room <= 0) return { error: LIMIT_MSG };
  const take = clean.slice(0, room);
  const { error } = await db.from("products").insert(
    take.map((r) => ({ store_id: store.id, title: r.title, price: r.price, category: r.category || null, active: true, images: [] })),
  );
  if (error) return { error: "تعذّرت إضافة المنتجات، حاول مرة أخرى" };
  syncCatalogLater(store.id);
  revalidatePath("/dashboard/products");
  refresh();
  const skipped = clean.length - take.length;
  return { ok: `أُضيف ${take.length} منتجاً.${skipped ? ` لم يُضف ${skipped} بسبب حد الباقة.` : ""} أضف الصور من صفحة كل منتج.` };
}
