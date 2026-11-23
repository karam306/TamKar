"use client";

import { useEffect, useRef, useState } from "react";

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
  single,
}: {
  name: string;
  initial: string[];
  upload: Uploader;
  max?: number;
  label?: string;
  /** Send just one URL instead of a list. */
  single?: boolean;
}) {
  const [images, setImages] = useState<string[]>(initial);
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [dragging, setDragging] = useState<number | null>(null);
  const full = images.length + busy >= max;

  // A photo dropped a little outside the box must not open in the browser and lose the form.
  useEffect(() => {
    const stop = (e: DragEvent) => {
      if (e.dataTransfer && Array.from(e.dataTransfer.types).includes("Files")) e.preventDefault();
    };
    window.addEventListener("dragover", stop);
    window.addEventListener("drop", stop);
    return () => {
      window.removeEventListener("dragover", stop);
      window.removeEventListener("drop", stop);
    };
  }, []);

  async function onFiles(files: FileList | File[] | null) {
    if (!files) return;
    setError("");
    const all = Array.from(files);
    const pics = all.filter((f) => f.type.startsWith("image/"));
    if (pics.length < all.length) setError("يمكن إضافة الصور فقط.");
    const list = pics.slice(0, max - images.length - busy);
    if (all.length && !list.length) return;
    setBusy(list.length);
    for (const file of list) {
      const blob = await shrink(file);
      const form = new FormData();
      form.append("file", new File([blob], "image", { type: blob.type || file.type }));
      const res = await upload(form);
      if (res.url) setImages((cur) => [...cur, res.url!]);
      else setError(res.error || "حدث خطأ أثناء رفع الصورة");
      setBusy((b) => b - 1);
    }
    if (input.current) input.current.value = "";
  }

  const isFileDrag = (e: React.DragEvent) => dragging === null && Array.from(e.dataTransfer.types).includes("Files");

  /** Drag a photo onto another to change the order. */
  const reorder = (from: number, to: number) =>
    setImages((cur) => {
      if (from === to) return cur;
      const next = [...cur];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });

  const move = (i: number, d: number) =>
    setImages((cur) => {
      const next = [...cur];
      const j = i + d;
      if (j < 0 || j >= next.length) return cur;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  return (
    <div
      className={`-m-2 flex flex-col gap-2 rounded-theme p-2 text-sm transition ${over ? "bg-primary/5 ring-2 ring-primary" : ""}`}
      onDragOver={(e) => {
        if (!isFileDrag(e) || full) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        setOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(false);
      }}
      onDrop={(e) => {
        if (!isFileDrag(e)) return;
        e.preventDefault();
        setOver(false);
        if (!full) onFiles(e.dataTransfer.files);
      }}
    >
      <span className="flex items-baseline justify-between gap-2">
        <span className="font-semibold">{label}</span>
        {!full && <span className="hidden text-xs text-muted sm:inline">اسحب الصور من جهازك وأفلتها هنا</span>}
      </span>
      <input type="hidden" name={name} value={single ? (images[0] ?? "") : JSON.stringify(images)} />
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {images.map((src, i) => (
          <div
            key={src}
            draggable={max > 1}
            onDragStart={(e) => {
              setDragging(i);
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragEnd={() => setDragging(null)}
            onDragOver={(e) => {
              if (dragging === null) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            }}
            onDrop={(e) => {
              if (dragging === null) return;
              e.preventDefault();
              reorder(dragging, i);
              setDragging(null);
            }}
            className={`group relative aspect-square overflow-hidden rounded-theme bg-surface ${max > 1 ? "cursor-grab active:cursor-grabbing" : ""} ${dragging === i ? "opacity-40" : ""}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" draggable={false} className="pointer-events-none h-full w-full object-cover" />
            {i === 0 && max > 1 && <span className="absolute right-1 top-1 rounded bg-primary px-1.5 text-[10px] text-white">الرئيسية</span>}
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/50 p-1 text-white">
              {max > 1 ? (
                <span className="flex gap-1">
                  <button type="button" onClick={() => move(i, -1)} aria-label="تقديم">
                    →
                  </button>
                  <button type="button" onClick={() => move(i, 1)} aria-label="تأخير">
                    ←
                  </button>
                </span>
              ) : (
                <span />
              )}
              <button type="button" onClick={() => setImages((cur) => cur.filter((x) => x !== src))} aria-label="حذف">
                ✕
              </button>
            </div>
          </div>
        ))}
        {Array.from({ length: busy }).map((_, i) => (
          <div key={`b${i}`} className="flex aspect-square animate-pulse items-center justify-center rounded-theme bg-surface text-xs text-muted">
            جارٍ الرفع...
          </div>
        ))}
        {!full && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-theme border-2 border-dashed px-1 text-center text-muted hover:border-primary hover:text-primary ${over ? "border-primary text-primary" : "border-black/15"}`}
          >
            <span className="text-2xl">+</span>
            <span className="text-xs">{over ? "أفلت الصور هنا" : "أضف صورة"}</span>
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/*" multiple={max > 1} hidden onChange={(e) => onFiles(e.target.files)} />
      {error && <p className="text-red-700">{error}</p>}
    </div>
  );
}
