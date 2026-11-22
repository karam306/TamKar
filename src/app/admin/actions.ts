"use server";

import { randomInt } from "node:crypto";
import { refresh, revalidatePath } from "next/cache";
import { BUSINESS_TYPES } from "@/lib/business-types";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { extendDate, trialEnd } from "@/lib/subscription";
import { supabaseAdmin } from "@/lib/supabase";
import { createTemplatePages, templateStoreFields } from "@/lib/store-setup";
import { normalizeWhatsapp, RESERVED_SLUGS } from "@/lib/templates";

const str = (f: FormData, k: string, max = 200) => String(f.get(k) ?? "").trim().slice(0, max);

/** Easy-to-type password: no look-alike letters. */
function makePassword() {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: 10 }, () => chars[randomInt(chars.length)]).join("");
}

export type CreateResult = { error?: string; created?: { id: string; slug: string; email: string; password: string; name: string } } | undefined;

export async function createMerchant(_: CreateResult, form: FormData): Promise<CreateResult> {
  await requirePlatformAdmin();
  const name = str(form, "store_name", 80);
  const slug = str(form, "slug", 40).toLowerCase();
  const email = str(form, "email", 120).toLowerCase();
  const password = str(form, "password", 72) || makePassword();
  const whatsapp = normalizeWhatsapp(str(form, "whatsapp", 20));
  const type = str(form, "business_type", 30);
  const plan = str(form, "plan", 20);
  const months = Math.max(0, Math.min(36, Number(form.get("months")) || 0));

  if (name.length < 2) return { error: "اكتب اسم المتجر" };
  if (!/^[a-z0-9-]{3,40}$/.test(slug) || slug.startsWith("-") || slug.endsWith("-")) return { error: "الرابط: أحرف إنكليزية صغيرة وأرقام وشرطة، 3 أحرف أو أكثر" };
  if (RESERVED_SLUGS.includes(slug)) return { error: "هالرابط محجوز" };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "الإيميل غير صحيح" };
  if (password.length < 8) return { error: "كلمة السر 8 أحرف على الأقل" };
  if (!/^\d{9,15}$/.test(whatsapp)) return { error: "رقم واتساب غير صحيح" };
  if (!BUSINESS_TYPES.some((b) => b.id === type)) return { error: "اختار نوع النشاط" };

  const admin = supabaseAdmin();
  const { data: taken } = await admin.from("stores").select("id").eq("slug", slug).maybeSingle();
  if (taken) return { error: "هالرابط مستخدم" };

  const { data: u, error: ue } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (ue || !u.user) return { error: /already|registered|exists/i.test(ue?.message ?? "") ? "في حساب بهالإيميل من قبل" : "ما قدرنا ننشئ الحساب" };

  const paid = plan === "trial" ? trialEnd() : months ? extendDate(null, months) : null;
  const { data: store, error: se } = await admin
    .from("stores")
    .insert({
      owner_id: u.user.id,
      slug,
      name,
      whatsapp,
      city: str(form, "city", 60) || null,
      currency: str(form, "currency", 3) === "SYP" ? "SYP" : "USD",
      ...templateStoreFields(type, name),
      plan: plan || "trial",
      paid_until: paid,
    })
    .select("id")
    .single();
  if (se || !store) {
    await admin.auth.admin.deleteUser(u.user.id);
    return { error: se?.code === "23505" ? "هالرابط مستخدم" : "ما قدرنا ننشئ المتجر" };
  }
  await createTemplatePages(store.id as string, type, name);
  await admin.from("store_admin").insert({
    store_id: store.id,
    owner_name: str(form, "owner_name", 80) || null,
    owner_phone: str(form, "owner_phone", 30) || null,
    note: str(form, "note", 1000) || null,
  });
  const salesman = str(form, "salesman_id", 40);
  if (salesman) await admin.from("store_admin").update({ salesman_id: salesman, heard_from: "مندوب" }).eq("store_id", store.id);
  revalidatePath("/admin");
  refresh();
  return { created: { id: store.id as string, slug, email, password, name } };
}

export async function setStoreStatus(form: FormData) {
  await requirePlatformAdmin();
  const id = str(form, "id", 40);
  const status = str(form, "status", 20);
  if (!["active", "suspended"].includes(status)) return;
  await supabaseAdmin().from("stores").update({ status }).eq("id", id);
  revalidatePath(`/admin/stores/${id}`);
  refresh();
}

export async function recordPayment(_: { error?: string; ok?: string } | undefined, form: FormData) {
  await requirePlatformAdmin();
  const admin = supabaseAdmin();
  const id = str(form, "id", 40);
  const months = Math.floor(Number(form.get("months")));
  const amount = Number(String(form.get("amount") ?? "").replace(/,/g, ""));
  if (!(months >= 1 && months <= 36)) return { error: "عدد الأشهر من 1 لـ 36" };
  if (!Number.isFinite(amount) || amount < 0) return { error: "المبلغ غير صحيح" };
  const { data: s } = await admin.from("stores").select("paid_until, plan").eq("id", id).maybeSingle();
  if (!s) return { error: "المتجر غير موجود" };
  const until = extendDate(s.plan === "trial" ? null : (s.paid_until as string | null), months);
  const plan = str(form, "plan", 20) || (s.plan === "trial" ? "basic" : (s.plan as string));
  const { error } = await admin.from("subscription_payments").insert({
    store_id: id,
    amount,
    currency: str(form, "currency", 3) === "SYP" ? "SYP" : "USD",
    months,
    method: str(form, "method", 40) || null,
    note: str(form, "note", 300) || null,
    paid_until: until,
  });
  if (error) return { error: "ما قدرنا نسجل الدفعة" };
  await admin.from("stores").update({ paid_until: until, plan, status: "active" }).eq("id", id);
  revalidatePath(`/admin/stores/${id}`);
  refresh();
  return { ok: `✓ انسجلت الدفعة. الاشتراك فعّال لغاية ${until}` };
}

/** One-click plan change from the store page. Keeps the paid-until date as it is. */
export async function setPlan(_: { error?: string; ok?: string } | undefined, form: FormData) {
  await requirePlatformAdmin();
  const id = str(form, "id", 40);
  const plan = str(form, "plan", 20);
  if (!["trial", "basic", "pro"].includes(plan)) return { error: "باقة غير معروفة" };
  const admin = supabaseAdmin();
  const { data, error } = await admin.from("stores").update({ plan }).eq("id", id).select("plan").maybeSingle();
  if (error || !data) {
    console.error("setPlan failed", error);
    return { error: `ما قدرنا نغيّر الباقة${error?.message ? ` (${error.message.slice(0, 80)})` : ""}` };
  }
  if (data.plan !== plan) return { error: "قاعدة البيانات رفضت التغيير. تأكد إن SUPABASE_SECRET_KEY بـ Vercel هو المفتاح السري (secret)" };
  revalidatePath(`/admin/stores/${id}`);
  revalidatePath("/admin/stores");
  refresh();
  return { ok: "✓ تغيّرت الباقة" };
}

export async function setPaidUntil(form: FormData) {
  await requirePlatformAdmin();
  const id = str(form, "id", 40);
  const date = str(form, "paid_until", 10);
  const plan = str(form, "plan", 20);
  await supabaseAdmin()
    .from("stores")
    .update({ paid_until: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null, ...(plan ? { plan } : {}) })
    .eq("id", id);
  revalidatePath(`/admin/stores/${id}`);
  refresh();
}

export async function saveMerchantInfo(form: FormData) {
  await requirePlatformAdmin();
  const id = str(form, "id", 40);
  const type = str(form, "business_type", 30);
  const admin = supabaseAdmin();
  if (BUSINESS_TYPES.some((b) => b.id === type)) await admin.from("stores").update({ business_type: type }).eq("id", id);
  await admin.from("store_admin").upsert({
    store_id: id,
    owner_name: str(form, "owner_name", 80) || null,
    owner_phone: str(form, "owner_phone", 30) || null,
    note: str(form, "note", 1000) || null,
    updated_at: new Date().toISOString(),
  });
  revalidatePath(`/admin/stores/${id}`);
  refresh();
}

export async function resetPassword(_: { password?: string; error?: string } | undefined, form: FormData) {
  await requirePlatformAdmin();
  const admin = supabaseAdmin();
  const { data: s } = await admin.from("stores").select("owner_id").eq("id", str(form, "id", 40)).maybeSingle();
  if (!s) return { error: "المتجر غير موجود" };
  const typed = String(form.get("password") ?? "").trim();
  if (typed && typed.length < 8) return { error: "كلمة السر لازم تكون 8 أحرف على الأقل" };
  const password = typed || makePassword();
  const { error } = await admin.auth.admin.updateUserById(s.owner_id as string, { password });
  if (error) return { error: "ما قدرنا نغير كلمة السر" };
  return { password };
}
