"use server";

import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { supabaseUser } from "@/lib/auth";
import { hasSupabase, supabaseAdmin } from "@/lib/supabase";
import { sendTelegram } from "@/lib/telegram";

const CODE_MINUTES = 15;
const MAX_TRIES = 5;
const hash = (code: string, storeId: string) => createHash("sha256").update(`${storeId}:${code}`).digest("hex");

export type ResetState = { step?: "code"; email?: string; error?: string } | undefined;

async function ownerByEmail(email: string) {
  const { data, error } = await supabaseAdmin().rpc("owner_by_email", { p_email: email });
  if (error) console.error("owner_by_email", error.message);
  const row = Array.isArray(data) ? data[0] : null;
  return row ? (row as { user_id: string; store_id: string; store_name: string }) : null;
}

/** Sends a 6-digit code to the store's Telegram. The answer is the same whether or not the email exists. */
export async function requestResetCode(_: ResetState, form: FormData): Promise<ResetState> {
  if (!hasSupabase) return { error: "قاعدة البيانات غير مربوطة بعد" };
  const email = String(form.get("email") ?? "").trim().toLowerCase().slice(0, 120);
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "اكتب إيميل صحيح" };
  const owner = await ownerByEmail(email);
  if (owner) {
    const admin = supabaseAdmin();
    const { data: row } = await admin.from("store_admin").select("telegram_chat_id, reset_expires").eq("store_id", owner.store_id).maybeSingle();
    const chat = row?.telegram_chat_id as string | null | undefined;
    const lastSent = row?.reset_expires ? new Date(row.reset_expires as string).getTime() - CODE_MINUTES * 60000 : 0;
    if (chat && Date.now() - lastSent > 60000) {
      const code = String(randomInt(100000, 1000000));
      await admin
        .from("store_admin")
        .update({ reset_code_hash: hash(code, owner.store_id), reset_expires: new Date(Date.now() + CODE_MINUTES * 60000).toISOString(), reset_attempts: 0 })
        .eq("store_id", owner.store_id);
      await sendTelegram(chat, `🔑 كود تغيير كلمة السر لمتجر ${owner.store_name}:\n\n${code}\n\nصالح لـ${CODE_MINUTES} دقيقة. إذا ما طلبته أنت، تجاهل هالرسالة.`);
    }
  }
  return { step: "code", email };
}

export async function resetWithCode(_: ResetState, form: FormData): Promise<ResetState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase().slice(0, 120);
  const code = String(form.get("code") ?? "").replace(/\D/g, "");
  const password = String(form.get("password") ?? "");
  const back = { step: "code" as const, email };
  if (code.length !== 6) return { ...back, error: "الكود 6 أرقام" };
  if (password.length < 8) return { ...back, error: "كلمة السر لازم تكون 8 أحرف أو أكتر" };

  const owner = await ownerByEmail(email);
  const wrong = { ...back, error: "الكود غلط أو انتهى. اطلب كود جديد." };
  if (!owner) return wrong;
  const admin = supabaseAdmin();
  const { data: row } = await admin.from("store_admin").select("reset_code_hash, reset_expires, reset_attempts").eq("store_id", owner.store_id).maybeSingle();
  if (!row?.reset_code_hash || !row.reset_expires || new Date(row.reset_expires as string) < new Date() || Number(row.reset_attempts) >= MAX_TRIES) return wrong;
  const a = Buffer.from(hash(code, owner.store_id));
  const b = Buffer.from(row.reset_code_hash as string);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    await admin.from("store_admin").update({ reset_attempts: Number(row.reset_attempts) + 1 }).eq("store_id", owner.store_id);
    return wrong;
  }
  const { error } = await admin.auth.admin.updateUserById(owner.user_id, { password });
  if (error) return { ...back, error: "ما قدرنا نغيّر كلمة السر، جرب مرة تانية" };
  await admin.from("store_admin").update({ reset_code_hash: null, reset_expires: null, reset_attempts: 0 }).eq("store_id", owner.store_id);
  const db = await supabaseUser();
  await db.auth.signInWithPassword({ email, password });
  redirect("/dashboard");
}
