"use client";

import { useRef, useState } from "react";

type Uploader = (form: FormData) => Promise<{ url?: string; error?: string }>;

/** Shrinks a photo in the browser before upload: faster on slow connections. */
export async function shrink(file: File, max = 1600): Promise<Blob> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

export function ImageUploader({
  name,
  initial,
  upload,
  max = 8,
  label = "صور المنتج",
}: {
  name: string;
  initial: string[];
  upload: Uploader;
  max?: number;
  label?: string;
}) {
  const [images, setImages] = useState<string[]>(initial);
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);

  async function onFiles(files: FileList | null) {
    if (!files) return;
    setError("");
    const list = Array.from(files).slice(0, max - images.length);
    setBusy(list.length);
    for (const file of list) {
      const blob = await shrink(file);
      const form = new FormData();
      form.append("file", new File([blob], "image", { type: blob.type || file.type }));
      const res = await upload(form);
      if (res.url) setImages((cur) => [...cur, res.url!]);
      else setError(res.error || "صار خطأ برفع الصورة");
      setBusy((b) => b - 1);
    }
    if (input.current) input.current.value = "";
  }

  const move = (i: number, d: number) =>
    setImages((cur) => {
      const next = [...cur];
      const j = i + d;
      if (j < 0 || j >= next.length) return cur;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  return (
    <div className="flex flex-col gap-2 text-sm">
      <span className="font-semibold">{label}</span>
      <input type="hidden" name={name} value={JSON.stringify(images)} />
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {images.map((src, i) => (
          <div key={src} className="group relative aspect-square overflow-hidden rounded-theme bg-surface">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="h-full w-full object-cover" />
            {i === 0 && max > 1 && <span className="absolute right-1 top-1 rounded bg-primary px-1.5 text-[10px] text-white">الرئيسية</span>}
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/50 p-1 text-white">
              {max > 1 ? (
                <span className="flex gap-1">
                  <button type="button" onClick={() => move(i, -1)} aria-label="قدّم">
                    →
                  </button>
                  <button type="button" onClick={() => move(i, 1)} aria-label="أخّر">
                    ←
                  </button>
                </span>
              ) : (
                <span />
              )}
              <button type="button" onClick={() => setImages((cur) => cur.filter((x) => x !== src))} aria-label="احذف">
                ✕
              </button>
            </div>
          </div>
        ))}
        {Array.from({ length: busy }).map((_, i) => (
          <div key={`b${i}`} className="flex aspect-square animate-pulse items-center justify-center rounded-theme bg-surface text-xs text-muted">
            جاري الرفع...
          </div>
        ))}
        {images.length + busy < max && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-theme border-2 border-dashed border-black/15 text-muted hover:border-primary hover:text-primary"
          >
            <span className="text-2xl">+</span>
            <span className="text-xs">أضف صورة</span>
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/*" multiple={max > 1} hidden onChange={(e) => onFiles(e.target.files)} />
      {error && <p className="text-red-700">{error}</p>}
    </div>
  );
}
