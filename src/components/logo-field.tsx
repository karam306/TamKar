"use client";

import { useRef, useState } from "react";
import { shrink } from "@/components/image-uploader";
import { uploadImage } from "@/app/dashboard/products/actions";

/** Store logo upload. Sends the URL as a hidden "logo_url" field with the form. */
export function LogoField({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-2 text-sm">
      <input type="hidden" name="logo_url" value={value} />
      <span className="font-semibold">شعار المتجر</span>
      <div className="flex flex-wrap items-center gap-3">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="h-16 w-28 rounded-lg border border-black/10 bg-white object-contain p-1" />
        ) : (
          <div className="flex h-16 w-28 items-center justify-center rounded-lg border border-dashed border-black/20 text-xs text-muted">لا يوجد شعار</div>
        )}
        <button type="button" className="btn btn-outline !py-1.5 text-xs" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? "جارٍ الرفع..." : value ? "تغيير الشعار" : "رفع الشعار"}
        </button>
        {value && (
          <button type="button" className="text-xs text-muted underline" onClick={() => setValue("")}>
            إزالة
          </button>
        )}
      </div>
      <p className="text-[12px] text-muted">يظهر في أعلى متجرك، وعلى الفواتير وعروض الأسعار. يُفضَّل شعار بخلفية شفافة أو بيضاء.</p>
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setBusy(true);
          setError("");
          const form = new FormData();
          const blob = await shrink(file);
          form.append("file", new File([blob], "image", { type: blob.type || file.type }));
          const res = await uploadImage(form);
          setBusy(false);
          if (res.url) setValue(res.url);
          else setError(res.error || "لم يُرفع الشعار. أعد المحاولة.");
          e.target.value = "";
        }}
      />
      {error && <p className="text-red-700">{error}</p>}
    </div>
  );
}
