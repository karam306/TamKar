"use client";

import { useActionState, useState } from "react";
import { Field, FormMessage, SubmitButton } from "@/components/form-ui";
import { ImageUploader } from "@/components/image-uploader";
import type { StoreSeo, StoreSocial } from "@/lib/types";
import { uploadImage } from "../products/actions";
import { saveSeo } from "./actions";

export function SeoForm({ seo, social, name, tagline, slug }: { seo: StoreSeo; social: StoreSocial; name: string; tagline: string; slug: string }) {
  const [state, action] = useActionState(saveSeo, undefined);
  const [title, setTitle] = useState(seo.title ?? "");
  const [desc, setDesc] = useState(seo.description ?? "");
  return (
    <form action={action} className="space-y-4">
      <section className="card space-y-3 p-4">
        <h2 className="text-sm font-semibold">كيف يظهر متجرك في Google</h2>
        <div className="rounded-lg border border-black/10 p-3">
          <div className="text-xs text-muted" dir="ltr" style={{ textAlign: "right" }}>
            …/s/{slug}
          </div>
          <div className="text-lg text-[#1a0dab]">{title || name}</div>
          <div className="text-[13px] text-muted">{desc || tagline || "وصف متجرك"}</div>
        </div>
        <Field label={`العنوان (${title.length}/70)`} hint="اسم المتجر وأهم ما تبيعه، مثلاً: لمار، فساتين وأزياء نسائية في دمشق">
          <input name="title" maxLength={70} value={title} onChange={(e) => setTitle(e.target.value)} className="input" placeholder={name} />
        </Field>
        <Field label={`الوصف (${desc.length}/170)`} hint="جملتان تعرّفان بمتجرك وتشجعان على زيارته">
          <textarea name="description" rows={3} maxLength={170} value={desc} onChange={(e) => setDesc(e.target.value)} className="input" placeholder={tagline} />
        </Field>
        <ImageUploader name="image" initial={seo.image ? [seo.image] : []} upload={uploadImage} max={1} single label="صورة المشاركة (تظهر عند إرسال رابط متجرك عبر واتساب أو فيسبوك)" />
      </section>

      <section className="card space-y-3 p-4">
        <h2 className="text-sm font-semibold">مواقع التواصل الاجتماعي</h2>
        <p className="text-xs text-muted">تظهر كأيقونات أسفل المتجر</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {(["instagram", "facebook", "tiktok", "telegram"] as const).map((k) => (
            <Field key={k} label={k[0].toUpperCase() + k.slice(1)}>
              <input name={k} defaultValue={social[k] ?? ""} dir="ltr" className="input" placeholder={`https://${k === "telegram" ? "t.me" : k + ".com"}/...`} />
            </Field>
          ))}
        </div>
      </section>
      <FormMessage state={state} />
      <SubmitButton>حفظ</SubmitButton>
    </form>
  );
}
