"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/components/form-ui";
import { requireMerchant } from "@/lib/auth";
import { BUSINESS_TYPES } from "@/lib/business-types";
import { createTemplatePages, templateStoreFields } from "@/lib/store-setup";
import type { Section, ThemeId } from "@/lib/types";

const THEMES: ThemeId[] = ["classic", "bold", "soft"];
const t = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Cleans what the browser sent so only valid, safe sections are saved. */
function cleanSections(input: unknown, storeId: string): Section[] {
  if (!Array.isArray(input)) return [];
  const img = (v: unknown) => {
    const s = t(v, 200);
    return s.startsWith(`/api/media/${storeId}/`) ? s : undefined;
  };
  const out: Section[] = [];
  for (const raw of input.slice(0, 15)) {
    const s = raw as Record<string, unknown>;
    const before = out.length;
    switch (s?.type) {
      case "announcement":
        out.push({ type: "announcement", text: t(s.text, 120) });
        break;
      case "hero":
        out.push({ type: "hero", title: t(s.title, 100), subtitle: t(s.subtitle, 200), buttonText: t(s.buttonText, 30), image: img(s.image) });
        break;
      case "categories":
        out.push({ type: "categories", title: t(s.title, 80) });
        break;
      case "featured_products": {
        const limit = Math.min(24, Math.max(2, Math.floor(Number(s.limit) || 8)));
        out.push({ type: "featured_products", title: t(s.title, 80), limit });
        break;
      }
      case "image_text":
        out.push({ type: "image_text", title: t(s.title, 100), text: t(s.text, 1000), image: img(s.image) });
        break;
      case "testimonials": {
        const items = Array.isArray(s.items) ? s.items.slice(0, 6) : [];
        out.push({
          type: "testimonials",
          title: t(s.title, 80),
          items: items.map((i: Record<string, unknown>) => ({ name: t(i?.name, 40), text: t(i?.text, 300) })).filter((i) => i.text),
        });
        break;
      }
      case "whatsapp_cta":
        out.push({ type: "whatsapp_cta", title: t(s.title, 80), text: t(s.text, 200) });
        break;
      case "collection_products": {
        const cid = t(s.collectionId, 40);
        out.push({
          type: "collection_products",
          title: t(s.title, 80),
          collectionId: /^[0-9a-f-]{36}$/.test(cid) ? cid : undefined,
          limit: Math.min(24, Math.max(2, Math.floor(Number(s.limit) || 8))),
        });
        break;
      }
      case "image_banner": {
        const link = t(s.link, 200);
        out.push({
          type: "image_banner",
          image: img(s.image),
          title: t(s.title, 100),
          text: t(s.text, 200),
          buttonText: t(s.buttonText, 30),
          link: link.startsWith("/") || /^https:\/\//.test(link) ? link : "/products",
        });
        break;
      }
      case "features": {
        const items = Array.isArray(s.items) ? s.items.slice(0, 6) : [];
        out.push({
          type: "features",
          items: items.map((i: Record<string, unknown>) => ({ icon: t(i?.icon, 8), title: t(i?.title, 40), text: t(i?.text, 80) })).filter((i) => i.title),
        });
        break;
      }
      case "faq": {
        const items = Array.isArray(s.items) ? s.items.slice(0, 15) : [];
        out.push({
          type: "faq",
          title: t(s.title, 80),
          items: items.map((i: Record<string, unknown>) => ({ q: t(i?.q, 200), a: t(i?.a, 1000) })).filter((i) => i.q && i.a),
        });
        break;
      }
      case "rich_text":
        out.push({ type: "rich_text", title: t(s.title, 100), text: t(s.text, 3000) });
        break;
    }
    if (s?.hidden === true && out.length > before) out[out.length - 1].hidden = true;
  }
  return out;
}

export async function saveDesign(_: FormState, form: FormData): Promise<FormState> {
  const { store, db } = await requireMerchant();
  const theme = String(form.get("theme") ?? "") as ThemeId;
  const color = String(form.get("primary_color") ?? "");
  const logo = String(form.get("logo_url") ?? "");
  let sections: unknown = [];
  try {
    sections = JSON.parse(String(form.get("sections") ?? "[]"));
  } catch {
    return { error: "صار خطأ بالأقسام" };
  }

  const { error } = await db
    .from("stores")
    .update({
      theme: THEMES.includes(theme) ? theme : store.theme,
      primary_color: /^#[0-9a-fA-F]{6}$/.test(color) ? color : null,
      logo_url: logo.startsWith(`/api/media/${store.id}/`) ? logo : null,
      sections: cleanSections(sections, store.id),
    })
    .eq("id", store.id);
  if (error) return { error: "ما قدرنا نحفظ، جرب مرة تانية" };
  revalidatePath("/dashboard/design");
  return { ok: `✓ انحفظ التصميم (${new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })})` };
}

/** Starts the design over from the ready-made template of a business type. */
export async function applyTemplate(form: FormData) {
  const { store, db } = await requireMerchant();
  const type = String(form.get("business_type") ?? "");
  if (!BUSINESS_TYPES.some((b) => b.id === type)) return;
  const fields = templateStoreFields(type, store.name);
  const hasMenus = Boolean((store as { menus?: { header?: unknown[] } }).menus?.header?.length);
  const { menus, ...rest } = fields;
  await db.from("stores").update({ ...rest, ...(hasMenus ? {} : { menus }) }).eq("id", store.id);
  await createTemplatePages(store.id, type, store.name);
  revalidatePath("/dashboard", "layout");
}
