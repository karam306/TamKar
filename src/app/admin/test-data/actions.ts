"use server";

import { headers } from "next/headers";
import { refresh, revalidatePath } from "next/cache";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { deleteSeedStores, seedStores, type SeedResult } from "@/lib/seed-stores";
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
