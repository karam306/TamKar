"use server";

import { headers } from "next/headers";
import { refresh, revalidatePath } from "next/cache";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { deleteSeedStores, SEED_SLUGS, seedStores, type SeedResult } from "@/lib/seed-stores";
import { supabaseAdmin } from "@/lib/supabase";
import { normalizeWhatsapp } from "@/lib/templates";

export type SeedState = { results?: SeedResult[]; error?: string; ok?: string } | undefined;

export async function createTestStores(_: SeedState, form: FormData): Promise<SeedState> {
  const { email } = await requirePlatformAdmin();
  const wa = normalizeWhatsapp(String(form.get("whatsapp") ?? ""));
  if (!/^\d{9,15}$/.test(wa)) return { error: "اكتب رقم واتساب صحيح (رقمك، حتى توصلك رسائل الطلبات التجريبية)" };
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  const proto = h.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  const results = await seedStores(email, `${proto}://${host}`, wa);
  revalidatePath("/admin");
  refresh();
  return { results };
}

export async function removeTestStores(): Promise<SeedState> {
  await requirePlatformAdmin();
  const n = await deleteSeedStores();
  revalidatePath("/admin");
  refresh();
  return { ok: n ? `✓ انحذفت ${n} متاجر تجريبية` : "ما في متاجر تجريبية" };
}

export async function setTestPasswords(_: SeedState, form: FormData): Promise<SeedState> {
  await requirePlatformAdmin();
  const password = String(form.get("password") ?? "").trim();
  if (password.length < 8) return { error: "كلمة السر لازم تكون 8 أحرف على الأقل" };
  const db = supabaseAdmin();
  const { data } = await db.from("stores").select("name, slug, owner_id").in("slug", SEED_SLUGS);
  const results: SeedResult[] = [];
  for (const s of data ?? []) {
    const { data: u } = await db.auth.admin.getUserById(s.owner_id as string);
    const { error } = await db.auth.admin.updateUserById(s.owner_id as string, { password });
    results.push({ name: s.name as string, slug: s.slug as string, email: u.user?.email ?? "", password, orders: 0, error: error ? `ما قدرنا نغيرها: ${error.message}` : undefined });
  }
  return results.length ? { results } : { error: "ما في متاجر تجريبية" };
}
