"use server";

import { refresh, revalidatePath } from "next/cache";
import type { FormState } from "@/components/form-ui";
import { activateManaged, getStoreMeta, stopManaged, syncCatalog, testConnection } from "@/lib/meta-managed";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { supabaseAdmin } from "@/lib/supabase";
import { isPro } from "@/lib/plans";

async function storeFrom(form: FormData) {
  await requirePlatformAdmin();
  const id = String(form.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const { data } = await supabaseAdmin().from("stores").select("id, slug, name, plan, paid_until").eq("id", id).maybeSingle();
  return data as { id: string; slug: string; name: string; plan: string | null; paid_until: string | null } | null;
}

function done(id: string, r: { ok: string } | { error: string }): FormState {
  revalidatePath(`/admin/stores/${id}`);
  revalidatePath("/admin/meta");
  refresh();
  return r;
}

export async function metaActivate(_: FormState, form: FormData): Promise<FormState> {
  const s = await storeFrom(form);
  if (!s) return { error: "المتجر غير موجود" };
  if (!isPro(s)) return { error: "ربط Meta متاح في الباقة الاحترافية فقط. حوّل المتجر إلى الاحترافية أولاً" };
  return done(s.id, await activateManaged(s));
}

export async function metaStop(_: FormState, form: FormData): Promise<FormState> {
  const s = await storeFrom(form);
  if (!s) return { error: "المتجر غير موجود" };
  return done(s.id, await stopManaged(s));
}

export async function metaSync(_: FormState, form: FormData): Promise<FormState> {
  const s = await storeFrom(form);
  if (!s) return { error: "المتجر غير موجود" };
  const r = await syncCatalog(s.id);
  return done(s.id, "ok" in r && !r.ok ? { error: "الربط التلقائي غير مفعّل لهذا المتجر" } : r);
}

/** Turn the merchant's own pixel (manual option) back on without touching the Kun assets. */
export async function metaUseManual(_: FormState, form: FormData): Promise<FormState> {
  const s = await storeFrom(form);
  if (!s) return { error: "المتجر غير موجود" };
  const { row } = await getStoreMeta(s.id);
  if (row?.status === "active") return { error: "أوقف الربط التلقائي أولاً" };
  const { error } = await supabaseAdmin().from("store_meta").upsert({ store_id: s.id, mode: "manual", status: "off", updated_at: new Date().toISOString() });
  if (error) return { error: "تعذّر الحفظ" };
  return done(s.id, { ok: "✓ عاد المتجر إلى الربط اليدوي (بيكسل التاجر نفسه)" });
}

export async function metaSavePage(_: FormState, form: FormData): Promise<FormState> {
  const s = await storeFrom(form);
  if (!s) return { error: "المتجر غير موجود" };
  const page = String(form.get("page_url") ?? "").trim().slice(0, 300);
  const { error } = await supabaseAdmin().from("store_meta").upsert({ store_id: s.id, page_url: page || null, updated_at: new Date().toISOString() });
  if (error) return { error: "تعذّر الحفظ. هل نفّذت التحديث 012؟" };
  return done(s.id, { ok: "✓ تم الحفظ" });
}

export async function metaTest(): Promise<FormState> {
  await requirePlatformAdmin();
  return testConnection();
}
