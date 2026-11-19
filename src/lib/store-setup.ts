import "server-only";
import { templateFor, templateMenus, templatePages, templateSections } from "./business-templates";
import { supabaseAdmin } from "./supabase";

/** Fields for a brand-new store of this business type. */
export function templateStoreFields(type: string, name: string) {
  const t = templateFor(type);
  const pages = templatePages(type, name);
  return {
    business_type: type,
    theme: t.theme,
    primary_color: t.color,
    tagline: t.tagline,
    delivery_note: t.delivery,
    sections: templateSections(type, name),
    menus: templateMenus(pages),
  };
}

/** Creates the ready-made pages (about, delivery, returns...) that don't exist yet. */
export async function createTemplatePages(storeId: string, type: string, name: string) {
  const admin = supabaseAdmin();
  const pages = templatePages(type, name);
  const { data: existing } = await admin.from("pages").select("handle").eq("store_id", storeId);
  const have = new Set((existing ?? []).map((p) => p.handle as string));
  const rows = pages.filter((p) => !have.has(p.handle)).map((p) => ({ ...p, store_id: storeId }));
  if (rows.length) await admin.from("pages").insert(rows);
}
