"use server";

import { redirect } from "next/navigation";
import type { FormState } from "@/components/form-ui";
import { supabaseUser } from "@/lib/auth";
import { isAdminEmail } from "@/lib/platform-admin";
import { hasSupabase, supabaseAdmin } from "@/lib/supabase";
import { trialEnd } from "@/lib/subscription";
import { BUSINESS_TYPES } from "@/lib/business-types";
import { createTemplatePages, templateStoreFields } from "@/lib/store-setup";
import { normalizeWhatsapp, RESERVED_SLUGS } from "@/lib/templates";

const str = (f: FormData, k: string, max = 200) => String(f.get(k) ?? "").trim().slice(0, max);

/** Is this store address free? Used while the merchant types the store name. */
export async function checkSlug(slug: string): Promise<{ ok: boolean; reason?: string }> {
  const s = String(slug ?? "").toLowerCase();
  if (!/^[a-z0-9-]{3,40}$/.test(s) || s.startsWith("-") || s.endsWith("-")) return { ok: false, reason: "أحرف إنجليزية صغيرة وأرقام وشرطة، 3 أحرف على الأقل" };
  if (RESERVED_SLUGS.includes(s)) return { ok: false, reason: "هذا الرابط محجوز" };
  if (!hasSupabase) return { ok: true };
  const { data } = await supabaseAdmin().from("stores").select("id").eq("slug", s).maybeSingle();
  return data ? { ok: false, reason: "هذا الرابط مستخدم" } : { ok: true };
}

/** Which onboarding question an error belongs to, so the screen can go back to it. */
export type SignupState = { error?: string; field?: string } | undefined;

export async function signup(_: SignupState, form: FormData): Promise<SignupState> {
  if (!hasSupabase) return { error: "قاعدة البيانات غير مرتبطة بعد" };

  const storeName = str(form, "store_name", 80);
  const slug = str(form, "slug", 40).toLowerCase();
  const email = str(form, "email", 120).toLowerCase();
  const password = String(form.get("password") ?? "");
  const whatsapp = normalizeWhatsapp(str(form, "whatsapp", 20));
  const city = str(form, "city", 60);
  const typeRaw = str(form, "business_type", 30);
  const type = BUSINESS_TYPES.some((b) => b.id === typeRaw) ? typeRaw : "general";

  const ownerName = str(form, "owner_name", 80);
  const currency = str(form, "currency", 3) === "SYP" ? "SYP" : "USD";
  const delivery = form.get("delivery") === "yes";
  const feeRaw = str(form, "delivery_fee", 20).replace(/,/g, "");
  const fee = feeRaw === "" ? 0 : Number(feeRaw);
  const pickupNote = str(form, "pickup_note", 200);
  const instagramRaw = str(form, "instagram", 100).replace(/^@/, "");
  const color = str(form, "color", 7);
  const wantsHelp = form.get("wants_help") === "yes";
  const heardFrom = str(form, "heard_from", 20);
  const refCode = str(form, "ref", 12).toUpperCase().replace(/[^A-Z0-9]/g, "");

  if (storeName.length < 2) return { error: "أدخل اسم المتجر", field: "store_name" };
  if (!/^[a-z0-9-]{3,40}$/.test(slug) || slug.startsWith("-") || slug.endsWith("-")) {
    return { error: "يجب أن يتكوّن رابط المتجر من أحرف إنجليزية صغيرة وأرقام وشرطة (-) فقط، و3 أحرف على الأقل", field: "store_name" };
  }
  if (RESERVED_SLUGS.includes(slug)) return { error: "هذا الرابط محجوز، اختر رابطاً آخر", field: "store_name" };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "البريد الإلكتروني غير صحيح", field: "email" };
  if (password.length < 8) return { error: "يجب ألا تقل كلمة المرور عن 8 أحرف", field: "password" };
  if (!/^\d{9,15}$/.test(whatsapp)) return { error: "رقم واتساب غير صحيح", field: "whatsapp" };
  if (!Number.isFinite(fee) || fee < 0) return { error: "سعر التوصيل غير صحيح", field: "delivery_fee" };

  const admin = supabaseAdmin();
  const { data: taken, error: checkError } = await admin.from("stores").select("id").eq("slug", slug).maybeSingle();
  if (checkError) {
    console.error("signup: stores check failed", checkError.code, checkError.message);
    return { error: `قاعدة البيانات غير جاهزة (رمز: DB ${checkError.code ?? ""} ${(checkError.message ?? "").slice(0, 80)})، يُرجى التواصل مع الدعم` };
  }
  if (taken) return { error: "هذا الرابط مستخدم، اختر رابطاً آخر", field: "store_name" };

  const { data: created, error: userError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (userError || !created.user) {
    const msg = userError?.message ?? "";
    console.error("signup: createUser failed", userError?.status, userError?.code, msg);
    return /already|registered|exists/i.test(msg)
      ? { error: "يوجد حساب مسجّل بهذا البريد الإلكتروني. سجّل الدخول، أو استخدم بريداً آخر", field: "email" }
      : { error: "تعذّر إنشاء الحساب، حاول مرة أخرى" };
  }

  const { data: newStore, error: storeError } = await admin
    .from("stores")
    .insert({
      owner_id: created.user.id,
      slug,
      name: storeName,
      whatsapp,
      city: city || null,
      ...templateStoreFields(type, storeName),
      currency,
      ...(/^#[0-9a-f]{6}$/i.test(color) ? { primary_color: color } : {}),
      shipping: delivery ? { delivery: true, default_fee: fee, rates: [] } : { delivery: false, pickup_note: pickupNote || null },
      ...(/^[a-z0-9._]{1,30}$/i.test(instagramRaw) ? { social: { instagram: `https://instagram.com/${instagramRaw}` } } : {}),
      plan: "trial",
      paid_until: trialEnd(),
    })
    .select("id")
    .single();
  if (storeError) {
    console.error("signup: store insert failed", storeError.code, storeError.message);
    await admin.auth.admin.deleteUser(created.user.id);
    return storeError.code === "23505" ? { error: "هذا الرابط مستخدم، اختر رابطاً آخر", field: "store_name" } : { error: "تعذّر إنشاء المتجر، حاول مرة أخرى" };
  }

  if (newStore) {
    await createTemplatePages(newStore.id as string, type, storeName);
    await admin.from("store_admin").upsert({
      store_id: newStore.id,
      owner_name: ownerName || null,
      owner_phone: whatsapp,
      note: wantsHelp ? "🙋 طلب المساعدة في تجهيز المتجر والإعلانات (من صفحة التسجيل)" : null,
    });
    // Separate step so signup still works before update 010 is run.
    let salesmanId: string | null = null;
    if (refCode) {
      const { data: m } = await admin.from("salesmen").select("id").eq("code", refCode).eq("active", true).maybeSingle();
      salesmanId = (m?.id as string | undefined) ?? null;
    }
    const label = HEARD_LABELS[heardFrom] ?? (refCode ? "مندوب" : null);
    const heard = label ? `${label}${refCode && !salesmanId ? `: رمز ${refCode} (غير معروف)` : ""}` : null;
    if (heard || salesmanId) {
      const { error: srcError } = await admin.from("store_admin").update({ heard_from: heard, salesman_id: salesmanId }).eq("store_id", newStore.id);
      if (srcError) console.error("signup: source not saved (run 010)", srcError.message);
    }
  }
  const db = await supabaseUser();
  await db.auth.signInWithPassword({ email, password });
  redirect("/dashboard?welcome=1");
}

const HEARD_LABELS: Record<string, string> = {
  salesman: "مندوب",
  instagram: "إنستغرام",
  facebook: "فيسبوك",
  tiktok: "تيك توك",
  friend: "صديق أو تاجر",
  other: "مصدر آخر",
};

export async function login(_: FormState, form: FormData): Promise<FormState> {
  if (!hasSupabase) return { error: "قاعدة البيانات غير مرتبطة بعد" };
  const db = await supabaseUser();
  const { data, error } = await db.auth.signInWithPassword({
    email: str(form, "email", 120).toLowerCase(),
    password: String(form.get("password") ?? ""),
  });
  if (error) {
    console.error("login failed", error.status, error.code, error.message);
    if (error.code === "email_not_confirmed") return { error: "لم يُؤكَّد البريد الإلكتروني بعد. تواصل مع الدعم" };
    if (error.code === "invalid_credentials") return { error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" };
    return { error: `تعذّر تسجيل الدخول (${error.code ?? error.status ?? ""}: ${error.message.slice(0, 80)})` };
  }
  redirect(isAdminEmail(data.user?.email) ? "/admin" : "/dashboard");
}

export async function logout() {
  const db = await supabaseUser();
  await db.auth.signOut();
  redirect("/login");
}
