"use server";

import { headers } from "next/headers";
import { refresh, revalidatePath } from "next/cache";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { supabaseAdmin } from "@/lib/supabase";
import { botUsername, tg, webhookSecret } from "@/lib/telegram";

type Res = { ok?: string; error?: string } | undefined;
const str = (f: FormData, k: string, max = 200) => String(f.get(k) ?? "").trim().slice(0, max);

/** Points the Telegram bot at this website. Needed once, and again if the domain changes. */
export async function activateTelegram(): Promise<Res> {
  await requirePlatformAdmin();
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host");
  if (!host || host.startsWith("localhost")) return { error: "لازم تكبسها من الموقع الحقيقي، مو من localhost" };
  const r = await tg("setWebhook", {
    url: `https://${host}/api/telegram`,
    secret_token: webhookSecret(),
    allowed_updates: ["message"],
    drop_pending_updates: true,
  });
  if (!r.ok) return { error: `تيليغرام رفض (${r.description ?? ""}). تأكد إنو TELEGRAM_BOT_TOKEN صحيح بـ Vercel` };
  revalidatePath("/admin");
  refresh();
  return { ok: `✓ البوت @${(await botUsername()) ?? ""} صار شغّال على ${host}` };
}

/** Code: capital letters and numbers. Made from the name when left empty. */
function makeCode(name: string) {
  const latin = name.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4);
  return `${latin || "S"}${Math.floor(100 + Math.random() * 900)}`;
}

export async function addSalesman(_: Res, form: FormData): Promise<Res> {
  await requirePlatformAdmin();
  const name = str(form, "name", 80);
  const phone = str(form, "phone", 20).replace(/[^\d+]/g, "") || null;
  const code = (str(form, "code", 12).toUpperCase().replace(/[^A-Z0-9]/g, "") || makeCode(name)).slice(0, 12);
  if (name.length < 2) return { error: "اكتب اسم المندوب" };
  if (code.length < 3) return { error: "الكود لازم يكون 3 أحرف أو أرقام إنكليزية على الأقل" };
  const { error } = await supabaseAdmin().from("salesmen").insert({ name, phone, code });
  if (error) {
    if (error.code === "23505") return { error: "هالكود مستخدم لمندوب تاني" };
    if (error.code === "42P01" || error.code === "PGRST205") return { error: "لازم تشغّل ملف 010 بـ Supabase أول" };
    return { error: `ما قدرنا نضيف المندوب (${error.message.slice(0, 60)})` };
  }
  revalidatePath("/admin/salesmen");
  refresh();
  return { ok: `✓ انضاف ${name}، الكود ${code}` };
}

export async function toggleSalesman(form: FormData) {
  await requirePlatformAdmin();
  const id = str(form, "id", 40);
  const active = form.get("active") === "1";
  await supabaseAdmin().from("salesmen").update({ active }).eq("id", id);
  revalidatePath("/admin/salesmen");
  refresh();
}

/** Change which salesman a store belongs to (or none). */
export async function setStoreSalesman(form: FormData) {
  await requirePlatformAdmin();
  const storeId = str(form, "store_id", 40);
  const salesman = str(form, "salesman_id", 40) || null;
  await supabaseAdmin().from("store_admin").upsert({ store_id: storeId, salesman_id: salesman }, { onConflict: "store_id" });
  revalidatePath(`/admin/stores/${storeId}`);
  revalidatePath("/admin/salesmen");
  refresh();
}
