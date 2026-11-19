"use client";

import { useActionState, useState } from "react";
import { Field, FormMessage, SubmitButton } from "@/components/form-ui";
import { ImageUploader } from "@/components/image-uploader";
import type { Collection } from "@/lib/types";
import { uploadImage } from "../products/actions";
import { saveCollection } from "./actions";

export function CollectionForm({ collection, children }: { collection?: Collection; children?: React.ReactNode }) {
  const [state, action] = useActionState(saveCollection, undefined);
  const [handle, setHandle] = useState(collection?.handle ?? "");
  return (
    <form action={action} className="grid items-start gap-4 lg:grid-cols-[1fr_300px]">
      <input type="hidden" name="id" value={collection?.id ?? ""} />
      <div className="space-y-4">
        <section className="card space-y-3 p-4">
          <Field label="الاسم">
            <input name="title" required defaultValue={collection?.title} className="input" placeholder="مثلاً: وصل حديثاً" />
          </Field>
          <Field label="الوصف">
            <textarea name="description" rows={4} defaultValue={collection?.description ?? ""} className="input" />
          </Field>
        </section>
        {children}
      </div>
      <div className="space-y-4">
        <section className="card space-y-3 p-4">
          <ImageUploaderSingle initial={collection?.image ?? ""} />
          <Field label="الرابط" hint={<bdi dir="ltr">/collections/{handle || "..."}</bdi>}>
            <input
              name="handle"
              dir="ltr"
              className="input"
              placeholder="new-arrivals"
              value={handle}
              onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            />
          </Field>
        </section>
        <FormMessage state={state} />
        <SubmitButton className="w-full">احفظ</SubmitButton>
      </div>
    </form>
  );
}

function ImageUploaderSingle({ initial }: { initial: string }) {
  return <ImageUploader name="image" initial={initial ? [initial] : []} upload={uploadImage} max={1} label="الصورة" single />;
}
