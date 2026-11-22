"use server";

import { randomInt } from "node:crypto";
import { refresh, revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth";
import { isPro, LIMITS } from "@/lib/plans";
import { supabaseAdmin } from "@/lib/supabase";
import { PERMS } from "@/lib/permissions";

export type TeamState =
  | {
      error?: string;
      ok?: string;
      created?: { email: string; password: string };
    }
  | undefined;

const makePassword = () => {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: 10 }, () => chars[randomInt(chars.length)]).join(
    "",
  );
};

/** Owner adds a staff login. The password is shown once so the owner can pass it on. */
export async function addStaff(
  _: TeamState,
  form: FormData,
): Promise<TeamState> {
  const { store, user } = await requireOwner();
  if (!isPro(store))
    return { error: "حسابات الموظفين متاحة في الباقة الاحترافية" };
  const email = String(form.get("email") ?? "")
    .trim()
    .toLowerCase()
    .slice(0, 120);
  const name = String(form.get("name") ?? "")
    .trim()
    .slice(0, 60);
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "البريد الإلكتروني غير صحيح" };
  if (email === user.email?.toLowerCase()) return { error: "هذا بريدك الإلكتروني" };
  const admin = supabaseAdmin();
  const { count } = await admin
    .from("store_staff")
    .select("user_id", { count: "exact", head: true })
    .eq("store_id", store.id);
  if ((count ?? 0) >= LIMITS.pro.staff)
    return { error: `الحد ${LIMITS.pro.staff} موظفين` };

  const password = makePassword();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) {
    return {
      error: /already|registered|exists/i.test(error?.message ?? "")
        ? "يوجد حساب مسجّل بهذا البريد الإلكتروني. استخدم بريداً آخر للموظف"
        : "تعذّر إنشاء الحساب",
    };
  }
  const perms = PERMS.filter((p) => form.get(`perm_${p}`) === "on");
  let { error: e2 } = await admin
    .from("store_staff")
    .insert({
      store_id: store.id,
      user_id: data.user.id,
      email,
      name: name || null,
      permissions: perms,
    });
  // Before update 011 there is no permissions column: add the staff member with the old defaults.
  if (e2 && /permissions/.test(e2.message))
    ({ error: e2 } = await admin
      .from("store_staff")
      .insert({
        store_id: store.id,
        user_id: data.user.id,
        email,
        name: name || null,
      }));
  if (e2) {
    await admin.auth.admin.deleteUser(data.user.id);
    return { error: "تعذّرت إضافة الموظف" };
  }
  revalidatePath("/dashboard/settings/team");
  refresh();
  return { created: { email, password } };
}

/** Which tabs this staff member can open. */
export async function saveStaffPerms(
  _: TeamState,
  form: FormData,
): Promise<TeamState> {
  const { store } = await requireOwner();
  const userId = String(form.get("user_id") ?? "");
  const perms = PERMS.filter((p) => form.get(`perm_${p}`) === "on");
  const { error } = await supabaseAdmin()
    .from("store_staff")
    .update({ permissions: perms })
    .eq("store_id", store.id)
    .eq("user_id", userId);
  if (error)
    return {
      error: /permissions/.test(error.message)
        ? "يجب تشغيل التحديث 011 في قاعدة البيانات أولاً"
        : "تعذّر الحفظ",
    };
  revalidatePath("/dashboard/settings/team");
  refresh();
  return { ok: "✓ تم حفظ الصلاحيات" };
}

/** Removes the staff member and their login. */
export async function removeStaff(form: FormData) {
  const { store } = await requireOwner();
  const userId = String(form.get("user_id") ?? "");
  const admin = supabaseAdmin();
  const { data } = await admin
    .from("store_staff")
    .delete()
    .eq("store_id", store.id)
    .eq("user_id", userId)
    .select("user_id")
    .maybeSingle();
  if (data) await admin.auth.admin.deleteUser(userId);
  revalidatePath("/dashboard/settings/team");
  refresh();
}

/** New password for a staff member who forgot theirs. */
export async function resetStaffPassword(
  _: TeamState,
  form: FormData,
): Promise<TeamState> {
  const { store } = await requireOwner();
  const userId = String(form.get("user_id") ?? "");
  const admin = supabaseAdmin();
  const { data } = await admin
    .from("store_staff")
    .select("email")
    .eq("store_id", store.id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return { error: "الموظف غير موجود" };
  const password = makePassword();
  const { error } = await admin.auth.admin.updateUserById(userId, { password });
  if (error) return { error: "تعذّر تغيير كلمة المرور" };
  return { created: { email: data.email as string, password } };
}
