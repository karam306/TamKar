"use client";

import { useActionState, useState } from "react";
import { Field, FormMessage, SubmitButton } from "@/components/form-ui";
import type { StorePage } from "@/lib/types";
import { savePage } from "./actions";

export function PageForm({ page }: { page?: StorePage }) {
  const [state, action] = useActionState(savePage, undefined);
  const [handle, setHandle] = useState(page?.handle ?? "");
  return (
    <form action={action} className="grid items-start gap-4 lg:grid-cols-[1fr_300px]">
      <input type="hidden" name="id" value={page?.id ?? ""} />
      <section className="card space-y-3 p-4">
        <Field label="العنوان">
          <input name="title" required defaultValue={page?.title} className="input" />
        </Field>
        <Field label="المحتوى" hint='اكتب "## " بأول السطر ليصير عنوان، واترك سطر فاضي بين الفقرات'>
          <textarea name="body" rows={16} defaultValue={page?.body ?? ""} className="input leading-7" />
        </Field>
      </section>
      <div className="space-y-4">
        <section className="card space-y-3 p-4">
          <Field label="الحالة">
            <select name="published" defaultValue={page && !page.published ? "off" : "on"} className="input">
              <option value="on">ظاهرة</option>
              <option value="off">مخفية</option>
            </select>
          </Field>
          <Field label="الرابط" hint={<bdi dir="ltr">/pages/{handle || "..."}</bdi>}>
            <input name="handle" dir="ltr" className="input" value={handle} onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} />
          </Field>
        </section>
        <FormMessage state={state} />
        <SubmitButton className="w-full">احفظ</SubmitButton>
      </div>
    </form>
  );
}
