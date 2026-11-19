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

export async function signup(_: FormState, form: FormData): Promise<FormState> {
  if (!hasSupabase) return { error: "قاعدة البيانات غير مربوطة بعد" };

  const storeName = str(form, "store_name", 80);
  const slug = str(form, "slug", 40).toLowerCase();
  const email = str(form, "email", 120).toLowerCase();
  const password = String(form.get("password") ?? "");
  const whatsapp = normalizeWhatsapp(str(form, "whatsapp", 20));
  const city = str(form, "city", 60);
  const typeRaw = str(form, "business_type", 30);
  const type = BUSINESS_TYPES.some((b) => b.id === typeRaw) ? typeRaw : "general";

  if (storeName.length < 2) return { error: "اكتب اسم المتجر" };
  if (!/^[a-z0-9-]{3,40}$/.test(slug) || slug.startsWith("-") || slug.endsWith("-")) {
    return { error: "رابط المتجر لازم يكون أحرف إنكليزية صغيرة وأرقام وشرطة (-) فقط، من 3 أحرف أو أكثر" };
  }
  if (RESERVED_SLUGS.includes(slug)) return { error: "هالرابط محجوز، اختار رابط تاني" };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "الإيميل غير صحيح" };
  if (password.length < 8) return { error: "كلمة السر لازم تكون 8 أحرف على الأقل" };
  if (!/^\d{9,15}$/.test(whatsapp)) return { error: "رقم واتساب غير صحيح" };

  const admin = supabaseAdmin();
  const { data: taken, error: checkError } = await admin.from("stores").select("id").eq("slug", slug).maybeSingle();
  if (checkError) {
    console.error("signup: stores check failed", checkError.code, checkError.message);
    return { error: `قاعدة البيانات مش جاهزة (رمز: DB ${checkError.code ?? ""} ${(checkError.message ?? "").slice(0, 80)})، تواصل مع الدعم` };
  }
  if (taken) return { error: "هالرابط مستخدم، اختار رابط تاني" };

  const { data: created, error: userError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (userError || !created.user) {
    const msg = userError?.message ?? "";
    console.error("signup: createUser failed", userError?.status, userError?.code, msg);
    return { error: /already|registered|exists/i.test(msg) ? "في حساب بهالإيميل، سجّل دخول" : "ما قدرنا ننشئ الحساب، جرب مرة تانية" };
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
      plan: "trial",
      paid_until: trialEnd(),
    })
    .select("id")
    .single();
  if (storeError) {
    console.error("signup: store insert failed", storeError.code, storeError.message);
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: storeError.code === "23505" ? "هالرابط مستخدم، اختار رابط تاني" : "ما قدرنا ننشئ المتجر، جرب مرة تانية" };
  }

  if (newStore) await createTemplatePages(newStore.id as string, type, storeName);
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
  if (error) return { error: "الإيميل أو كلمة السر غلط" };
  redirect(isAdminEmail(data.user?.email) ? "/admin" : "/dashboard");
}

export async function logout() {
  const db = await supabaseUser();
  await db.auth.signOut();
  redirect("/login");
}
