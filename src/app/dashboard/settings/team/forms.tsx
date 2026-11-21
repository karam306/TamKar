"use client";

import { useActionState } from "react";
import { Field, SubmitButton } from "@/components/form-ui";
import { addStaff, removeStaff, resetStaffPassword, type TeamState } from "./actions";

function Created({ state }: { state: TeamState }) {
  if (state?.error) return <p className="text-[13px] text-[#8e1f0b]">{state.error}</p>;
  if (!state?.created) return null;
  const msg = `حسابك على لوحة تحكم المتجر:\nالرابط: ${typeof window !== "undefined" ? window.location.origin : ""}/login\nالإيميل: ${state.created.email}\nكلمة السر: ${state.created.password}`;
  return (
    <div className="space-y-2 rounded-lg bg-[#f7f7f7] p-3 text-[13px]">
      <div className="font-semibold">⚠️ ابعتها للموظف هلق، ما رح تنعرض مرة تانية</div>
      <div dir="ltr" className="text-right">
        {state.created.email} · <b className="select-all">{state.created.password}</b>
      </div>
      <a href={`https://wa.me/?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener noreferrer" className="btn inline-block !bg-[#25D366]">
        ابعتها عالواتساب
      </a>
    </div>
  );
}

export function AddStaffForm() {
  const [state, action] = useActionState(addStaff, undefined);
  return (
    <section className="card space-y-3 p-4">
      <h2 className="text-sm font-semibold">ضيف موظف</h2>
      <form action={action} className="grid gap-3 sm:grid-cols-2">
        <Field label="اسم الموظف">
          <input name="name" className="input" placeholder="مثلاً: سامر" />
        </Field>
        <Field label="إيميله">
          <input name="email" required dir="ltr" className="input" inputMode="email" />
        </Field>
        <div className="sm:col-span-2">
          <SubmitButton>أنشئ حساب الموظف</SubmitButton>
        </div>
      </form>
      <Created state={state} />
    </section>
  );
}

export function StaffRow({ userId, email, name }: { userId: string; email: string; name: string }) {
  const [state, reset] = useActionState(resetStaffPassword, undefined);
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
            <button className="btn btn-outline !py-1 text-xs">كلمة سر جديدة</button>
          </form>
          <form action={removeStaff}>
            <input type="hidden" name="user_id" value={userId} />
            <button className="btn btn-outline !py-1 text-xs text-red-700">احذف</button>
          </form>
        </span>
      </div>
      <Created state={state} />
    </div>
  );
}
