"use client";

import { useState } from "react";
import { money, type Fx } from "@/lib/fx";
import type { Currency } from "@/lib/types";

export type StoryProduct = {
  title: string;
  price: number;
  compare?: number | null;
  image?: string | null;
};

export type StoryStore = {
  name: string;
  logo?: string | null;
  color?: string | null;
  currency: Currency;
  fx: Fx | null;
};

const W = 1080;
const H = 1920;
const FONT = '"Cairo", "IBM Plex Sans Arabic", system-ui, sans-serif';

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Splits text into at most `max` lines that fit `width`. */
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number, max: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width <= width || !line) line = next;
    else {
      lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  if (lines.length > max) {
    lines.length = max;
    lines[max - 1] = `${lines[max - 1].replace(/\s+\S*$/, "")}…`;
  }
  return lines;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Draws a 1080x1920 status/story image for one product and returns it as a PNG file. */
export async function drawStory(p: StoryProduct, s: StoryStore, link: string): Promise<File> {
  await Promise.all([
    document.fonts.load(`700 60px ${FONT}`),
    document.fonts.load(`900 60px ${FONT}`),
  ]).catch(() => {});
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const accent = s.color || "#3d6b3a";
  ctx.direction = "rtl";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = "#f7f6f1";
  ctx.fillRect(0, 0, W, H);

  // Store logo or name at the top.
  const logo = s.logo ? await loadImage(s.logo) : null;
  if (logo) {
    const h = 120;
    const w = Math.min(420, (logo.width / logo.height) * h);
    ctx.drawImage(logo, (W - w) / 2, 90, w, h);
  } else {
    ctx.fillStyle = "#1f2a1d";
    ctx.font = `900 64px ${FONT}`;
    ctx.fillText(s.name, W / 2, 175);
  }

  // Product photo.
  const box = { x: 100, y: 260, w: 880, h: 880 };
  ctx.save();
  roundRect(ctx, box.x, box.y, box.w, box.h, 48);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.clip();
  const photo = p.image ? await loadImage(p.image) : null;
  if (photo) {
    const scale = Math.max(box.w / photo.width, box.h / photo.height);
    const w = photo.width * scale;
    const h = photo.height * scale;
    ctx.drawImage(photo, box.x + (box.w - w) / 2, box.y + (box.h - h) / 2, w, h);
  }
  ctx.restore();

  // Title, up to two lines.
  ctx.fillStyle = "#1f2a1d";
  ctx.font = `700 64px ${FONT}`;
  const lines = wrap(ctx, p.title, 940, 2);
  let y = 1240;
  for (const l of lines) {
    ctx.fillText(l, W / 2, y);
    y += 84;
  }

  // Price, with the old price struck through when on sale.
  const m = money(s.currency, s.fx);
  ctx.fillStyle = accent;
  ctx.font = `900 96px ${FONT}`;
  const priceY = y + 70;
  ctx.fillText(m.text(m.unit(p.price)), W / 2, priceY);
  if (p.compare && p.compare > p.price) {
    const old = m.text(m.unit(p.compare));
    ctx.fillStyle = "#8a8a80";
    ctx.font = `700 52px ${FONT}`;
    const oy = priceY + 80;
    ctx.fillText(old, W / 2, oy);
    const ow = ctx.measureText(old).width;
    ctx.fillRect(W / 2 - ow / 2, oy - 18, ow, 5);
  }

  // Order button and the link.
  const btn = { w: 620, h: 130, y: H - 300 };
  roundRect(ctx, (W - btn.w) / 2, btn.y, btn.w, btn.h, 65);
  ctx.fillStyle = accent;
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 58px ${FONT}`;
  ctx.fillText("اطلب الآن", W / 2, btn.y + 85);
  ctx.direction = "ltr";
  ctx.fillStyle = "#4b5148";
  ctx.font = `600 40px ${FONT}`;
  ctx.fillText(link.replace(/^https?:\/\//, ""), W / 2, H - 95);

  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
  return new File([blob!], "status.png", { type: "image/png" });
}

/** Button: makes the image, then shares it (phones) or downloads it (computers). */
export function StoryButton({
  product,
  store,
  link,
  className = "btn btn-outline",
}: {
  product: StoryProduct;
  store: StoryStore;
  link: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{ url: string; file: File } | null>(null);

  async function make() {
    setBusy(true);
    try {
      const file = await drawStory(product, store, link);
      setPreview({ url: URL.createObjectURL(file), file });
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    if (!preview) return;
    const data = { files: [preview.file], text: `${product.title}\n${link}` };
    if (navigator.canShare?.(data)) {
      try {
        await navigator.share(data);
        return;
      } catch {
        return;
      }
    }
    const a = document.createElement("a");
    a.href = preview.url;
    a.download = `${product.title.slice(0, 40)}.png`;
    a.click();
  }

  return (
    <>
      <button type="button" className={className} onClick={make} disabled={busy}>
        {busy ? "جارٍ التجهيز..." : "صورة لحالة واتساب"}
      </button>
      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setPreview(null)}
        >
          <div className="max-h-full w-full max-w-sm space-y-3 overflow-auto rounded-xl bg-white p-4" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview.url} alt="" className="w-full rounded-lg border border-black/10" />
            <p className="text-[13px] text-muted">
              من الهاتف: اضغط مشاركة واختر واتساب، ثم «حالتي». من الحاسوب: تُحفظ الصورة في التنزيلات.
            </p>
            <div className="flex gap-2">
              <button type="button" className="btn flex-1" onClick={share}>
                مشاركة أو تنزيل
              </button>
              <button type="button" className="btn btn-outline" onClick={() => setPreview(null)}>
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
