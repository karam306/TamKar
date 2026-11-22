import { PageHeader } from "@/components/admin-ui";
import { ProGate } from "@/components/pro-gate";
import { requireOwner } from "@/lib/auth";
import { isPro, LIMITS } from "@/lib/plans";
import { supabaseAdmin } from "@/lib/supabase";
import { cleanPerms } from "@/lib/permissions";
import { AddStaffForm, StaffRow } from "./forms";

export default async function TeamPage() {
  const { store } = await requireOwner();
  if (!isPro(store))
    return (
      <div className="space-y-4">
        <PageHeader title="الموظفين" back="/dashboard/settings" />
        <ProGate feature="حسابات الموظفين" />
      </div>
    );
  const { data } = await supabaseAdmin()
    .from("store_staff")
    .select("*")
    .eq("store_id", store.id)
    .order("created_at");
  const staff = data ?? [];
  return (
    <div className="space-y-4">
      <PageHeader title="الموظفين" back="/dashboard/settings" />
      <p className="text-[13px] text-muted">
        الموظف بيدخل بإيميله وكلمة سره، وبيشوف بس الأقسام اللي بتختارها إله.
        الإعدادات (الدفع، التوصيل، الموظفين، الاشتراك) بتضل إلك لحالك.
      </p>
      <section className="card divide-y divide-black/5">
        {staff.length === 0 ? (
          <p className="p-4 text-center text-[13px] text-muted">
            لسا ما ضفت موظفين
          </p>
        ) : (
          staff.map((s) => (
            <StaffRow
              key={s.user_id as string}
              userId={s.user_id as string}
              email={s.email as string}
              name={(s.name as string) ?? ""}
              perms={cleanPerms(s.permissions)}
            />
          ))
        )}
      </section>
      {staff.length < LIMITS.pro.staff ? (
        <AddStaffForm />
      ) : (
        <p className="text-[13px] text-muted">
          وصلت للحد ({LIMITS.pro.staff} موظفين).
        </p>
      )}
    </div>
  );
}
