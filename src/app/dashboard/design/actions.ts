"use server";

import { refresh, revalidatePath } from "next/cache";
import type { FormState } from "@/components/form-ui";
import { requireAccess } from "@/lib/auth";
import { BUSINESS_TYPES } from "@/lib/business-types";
import { createTemplatePages, templateStoreFields } from "@/lib/store-setup";
import { cleanSections } from "@/lib/clean-sections";
import type { ThemeId } from "@/lib/types";

const THEMES: ThemeId[] = ["classic", "bold", "soft"];
const t = (v: unknown, max: number) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

export async function saveDesign(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const { store, db } = await requireAccess("design");
  const theme = String(form.get("theme") ?? "") as ThemeId;
  const color = String(form.get("primary_color") ?? "");
  const logo = String(form.get("logo_url") ?? "");
  let sections: unknown = [];
  try {
    sections = JSON.parse(String(form.get("sections") ?? "[]"));
  } catch {
    return { error: "حدث خطأ في الأقسام" };
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
  if (error) return { error: "تعذّر الحفظ، حاول مرة أخرى" };
  revalidatePath("/dashboard/design");
  refresh();
  return {
    ok: `✓ تم حفظ التصميم (${new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })})`,
  };
}

/** Starts the design over from the ready-made template of a business type. */
export async function applyTemplate(form: FormData) {
  const { store, db } = await requireAccess("design");
  const type = String(form.get("business_type") ?? "");
  if (!BUSINESS_TYPES.some((b) => b.id === type)) return;
  const fields = templateStoreFields(type, store.name);
  const hasMenus = Boolean(
    (store as { menus?: { header?: unknown[] } }).menus?.header?.length,
  );
  const { menus, ...rest } = fields;
  await db
    .from("stores")
    .update({ ...rest, ...(hasMenus ? {} : { menus }) })
    .eq("id", store.id);
  await createTemplatePages(store.id, type, store.name);
  revalidatePath("/dashboard", "layout");
  refresh();
}
