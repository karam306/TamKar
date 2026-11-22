"use server";

import { redirect } from "next/navigation";
import type { FormState } from "@/components/form-ui";
import { isAdminEmail } from "@/lib/platform-admin";
import { hasSupabase } from "@/lib/supabase";
import { supabaseUser } from "@/lib/auth";

const WRONG = "البريد الإلكتروني أو كلمة المرور غير صحيحة";

/** Platform owner login. Merchant emails are refused here without even trying them. */
export async function adminLogin(_: FormState, form: FormData): Promise<FormState> {
  if (!hasSupabase) return { error: "قاعدة البيانات غير مرتبطة بعد" };
  const email = String(form.get("email") ?? "").trim().toLowerCase().slice(0, 120);
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "أدخل البريد الإلكتروني وكلمة المرور" };
  if (!isAdminEmail(email)) return { error: WRONG };

  const db = await supabaseUser();
  await db.auth.signOut(); // leave any merchant session first
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) {
    console.error("admin login failed", error.status, error.code, error.message);
    if (error.code === "invalid_credentials") return { error: WRONG };
    if (error.code === "email_not_confirmed") return { error: "لم يُؤكَّد البريد الإلكتروني في Supabase بعد" };
    return { error: `تعذّر تسجيل الدخول (${error.code ?? error.status ?? ""})` };
  }
  redirect("/admin");
}

/** Signs out whoever is signed in (a merchant or a test store) so the owner can log in. */
export async function switchToAdmin() {
  const db = await supabaseUser();
  await db.auth.signOut();
  redirect("/admin/login");
}

export async function adminLogout() {
  const db = await supabaseUser();
  await db.auth.signOut();
  redirect("/admin/login");
}
