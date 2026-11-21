"use server";

import { refresh, revalidatePath } from "next/cache";
import type { FormState } from "@/components/form-ui";
import { requireOwner } from "@/lib/auth";
import type { MenuLink } from "@/lib/types";

const clean = (raw: unknown): MenuLink[] =>
  (Array.isArray(raw) ? raw : [])
    .slice(0, 12)
    .map((l: { label?: unknown; href?: unknown }) => ({ label: String(l?.label ?? "").trim().slice(0, 40), href: String(l?.href ?? "").trim().slice(0, 300) }))
    .filter((l) => l.label && (l.href.startsWith("/") || /^https:\/\//.test(l.href)));

export async function saveMenus(_: FormState, form: FormData): Promise<FormState> {
  const { store, db } = await requireOwner();
  let raw: { header?: unknown; footer?: unknown } = {};
  try {
    raw = JSON.parse(String(form.get("menus") ?? "{}"));
  } catch {}
  const { error } = await db.from("stores").update({ menus: { header: clean(raw.header), footer: clean(raw.footer) } }).eq("id", store.id);
  if (error) return { error: "ما قدرنا نحفظ، جرب مرة تانية" };
  revalidatePath("/dashboard/navigation");
  refresh();
  return { ok: "✓ انحفظت القوائم" };
}
