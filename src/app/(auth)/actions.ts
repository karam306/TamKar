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
  if (!/^[a-z0-9-]{3,40}$/.test(s) || s.startsWith("-") || s.endsWith("-")) return { ok: false, reason: "أحرف إنكليزية صغيرة وأرقام وشرطة، 3 أحرف أو أكتر" };
  if (RESERVED_SLUGS.includes(s)) return { ok: false, reason: "هالرابط محجوز" };
  if (!hasSupabase) return { ok: true };
  const { data } = await supabaseAdmin().from("stores").select("id").eq("slug", s).maybeSingle();
  return data ? { ok: false, reason: "هالرابط مستخدم" } : { ok: true };
}

/** Which onboarding question an error belongs to, so the screen can go back to it. */
export type SignupState = { error?: string; field?: string } | undefined;

export async function signup(_: SignupState, form: FormData): Promise<SignupState> {
  if (!hasSupabase) return { error: "قاعدة البيانات غير مربوطة بعد" };

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

  if (storeName.length < 2) return { error: "اكتب اسم المتجر", field: "store_name" };
  if (!/^[a-z0-9-]{3,40}$/.test(slug) || slug.startsWith("-") || slug.endsWith("-")) {
    return { error: "رابط المتجر لازم يكون أحرف إنكليزية صغيرة وأرقام وشرطة (-) فقط، من 3 أحرف أو أكثر", field: "store_name" };
  }
  if (RESERVED_SLUGS.includes(slug)) return { error: "هالرابط محجوز، اختار رابط تاني", field: "store_name" };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "الإيميل غير صحيح", field: "email" };
  if (password.length < 8) return { error: "كلمة السر لازم تكون 8 أحرف على الأقل", field: "password" };
  if (!/^\d{9,15}$/.test(whatsapp)) return { error: "رقم واتساب غير صحيح", field: "whatsapp" };
  if (!Number.isFinite(fee) || fee < 0) return { error: "سعر التوصيل غير صحيح", field: "delivery_fee" };

  const admin = supabaseAdmin();
  const { data: taken, error: checkError } = await admin.from("stores").select("id").eq("slug", slug).maybeSingle();
  if (checkError) {
    console.error("signup: stores check failed", checkError.code, checkError.message);
    return { error: `قاعدة البيانات مش جاهزة (رمز: DB ${checkError.code ?? ""} ${(checkError.message ?? "").slice(0, 80)})، تواصل مع الدعم` };
  }
  if (taken) return { error: "هالرابط مستخدم، اختار رابط تاني", field: "store_name" };

  const { data: created, error: userError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (userError || !created.user) {
    const msg = userError?.message ?? "";
    console.error("signup: createUser failed", userError?.status, userError?.code, msg);
    return /already|registered|exists/i.test(msg)
      ? { error: "في حساب بهالإيميل. سجّل دخول، أو استعمل إيميل تاني", field: "email" }
      : { error: "ما قدرنا ننشئ الحساب، جرب مرة تانية" };
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
    return storeError.code === "23505" ? { error: "هالرابط مستخدم، اختار رابط تاني", field: "store_name" } : { error: "ما قدرنا ننشئ المتجر، جرب مرة تانية" };
  }

  if (newStore) {
    await createTemplatePages(newStore.id as string, type, storeName);
    await admin.from("store_admin").upsert({
      store_id: newStore.id,
      owner_name: ownerName || null,
      owner_phone: whatsapp,
      note: wantsHelp ? "🙋 طلب مساعدة بتجهيز المتجر والإعلانات (من صفحة التسجيل)" : null,
    });
  }
  const db = await supabaseUser();
  await db.auth.signInWithPassword({ email, password });
  redirect("/dashboard?welcome=1");
}

export async function login(_: FormState, form: FormData): Promise<FormState> {
  if (!hasSupabase) return { error: "قاعدة البيانات غير مربوطة بعد" };
  const db = await supabaseUser();
  const { data, error } = await db.auth.signInWithPassword({
    email: str(form, "email", 120).toLowerCase(),
    password: String(form.get("password") ?? ""),
  });
  if (error) {
    console.error("login failed", error.status, error.code, error.message);
    if (error.code === "email_not_confirmed") return { error: "الإيميل لسا ما تأكد. تواصل مع الدعم" };
    if (error.code === "invalid_credentials") return { error: "الإيميل أو كلمة السر غلط" };
    return { error: `ما قدرنا نسجل دخول (${error.code ?? error.status ?? ""}: ${error.message.slice(0, 80)})` };
  }
  redirect(isAdminEmail(data.user?.email) ? "/admin" : "/dashboard");
}

export async function logout() {
  const db = await supabaseUser();
  await db.auth.signOut();
  redirect("/login");
}
