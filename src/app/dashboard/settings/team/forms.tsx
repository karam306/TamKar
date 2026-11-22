"use client";

import { useActionState } from "react";
import { Field, SubmitButton } from "@/components/form-ui";
import {
  DEFAULT_PERMS,
  PERM_LABELS,
  PERMS,
  type Perm,
} from "@/lib/permissions";
import {
  addStaff,
  removeStaff,
  resetStaffPassword,
  saveStaffPerms,
  type TeamState,
} from "./actions";

/** One checkbox per dashboard tab. */
function PermBoxes({ value }: { value: Perm[] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {PERMS.map((p) => (
        <label
          key={p}
          className="flex cursor-pointer items-start gap-2 rounded-lg border border-black/10 p-2 text-[13px] has-[:checked]:border-black/40 has-[:checked]:bg-[#f7f7f7]"
        >
          <input
            type="checkbox"
            name={`perm_${p}`}
            defaultChecked={value.includes(p)}
            className="mt-0.5 h-4 w-4 accent-black"
          />
          <span>
            <b className="block">
              {PERM_LABELS[p].icon} {PERM_LABELS[p].label}
            </b>
            <span className="text-[12px] text-muted">
              {PERM_LABELS[p].hint}
            </span>
          </span>
        </label>
      ))}
    </div>
  );
}

function Created({ state }: { state: TeamState }) {
  if (state?.error)
    return <p className="text-[13px] text-[#8e1f0b]">{state.error}</p>;
  if (!state?.created) return null;
  const msg = `حسابك على لوحة تحكم المتجر:\nالرابط: ${typeof window !== "undefined" ? window.location.origin : ""}/login\nالبريد الإلكتروني: ${state.created.email}\nكلمة المرور: ${state.created.password}`;
  return (
    <div className="space-y-2 rounded-lg bg-[#f7f7f7] p-3 text-[13px]">
      <div className="font-semibold">
        ⚠️ أرسلها إلى الموظف الآن، فلن تُعرض مرة أخرى
      </div>
      <div dir="ltr" className="text-right">
        {state.created.email} ·{" "}
        <b className="select-all">{state.created.password}</b>
      </div>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(msg)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="btn inline-block !bg-[#25D366]"
      >
        إرسالها عبر واتساب
      </a>
    </div>
  );
}

export function AddStaffForm() {
  const [state, action] = useActionState(addStaff, undefined);
  return (
    <section className="card space-y-3 p-4">
      <h2 className="text-sm font-semibold">إضافة موظف</h2>
      <form action={action} className="grid gap-3 sm:grid-cols-2">
        <Field label="اسم الموظف">
          <input name="name" className="input" placeholder="مثلاً: سامر" />
        </Field>
        <Field label="بريده الإلكتروني">
          <input
            name="email"
            required
            dir="ltr"
            className="input"
            inputMode="email"
          />
        </Field>
        <div className="space-y-2 sm:col-span-2">
          <div className="text-[13px] font-semibold">ما الأقسام التي يمكنه الوصول إليها؟</div>
          <PermBoxes value={DEFAULT_PERMS} />
        </div>
        <div className="sm:col-span-2">
          <SubmitButton>إنشاء حساب الموظف</SubmitButton>
        </div>
      </form>
      <Created state={state} />
    </section>
  );
}

export function StaffRow({
  userId,
  email,
  name,
  perms,
}: {
  userId: string;
  email: string;
  name: string;
  perms: Perm[];
}) {
  const [state, reset] = useActionState(resetStaffPassword, undefined);
  const [permState, savePerms] = useActionState(saveStaffPerms, undefined);
  return (
    <div className="space-y-2 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
        <span>
          <b>{name || "موظف"}</b>{" "}
          <span dir="ltr" className="text-muted">
            {email}
          </span>
        </span>
        <span className="flex gap-2">
          <form action={reset}>
            <input type="hidden" name="user_id" value={userId} />
            <button className="btn btn-outline !py-1 text-xs">
              كلمة مرور جديدة
            </button>
          </form>
          <form action={removeStaff}>
            <input type="hidden" name="user_id" value={userId} />
            <button className="btn btn-outline !py-1 text-xs text-red-700">
              حذف
            </button>
          </form>
        </span>
      </div>
      <details className="text-[13px]">
        <summary className="cursor-pointer text-[#005bd3]">
          الصلاحيات:{" "}
          {perms.length
            ? perms.map((p) => PERM_LABELS[p].label).join("، ")
            : "لا شيء"}
        </summary>
        <form action={savePerms} className="mt-2 space-y-2">
          <input type="hidden" name="user_id" value={userId} />
          <PermBoxes value={perms} />
          <SubmitButton>حفظ الصلاحيات</SubmitButton>
          {permState?.ok && <p className="text-green-700">{permState.ok}</p>}
          {permState?.error && (
            <p className="text-[#8e1f0b]">{permState.error}</p>
          )}
        </form>
      </details>
      <Created state={state} />
    </div>
  );
}
