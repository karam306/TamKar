import "server-only";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { MEDIA_BUCKET, supabaseAdmin } from "./supabase";

const MAX_BYTES = 4 * 1024 * 1024;

/**
 * Resizes an uploaded image to a light WebP and stores it under the store's folder.
 * Returns the public path served by our own domain (/api/media/...).
 */
export async function saveImage(storeId: string, file: File, maxSize = 1200): Promise<string> {
  if (!file || file.size === 0) throw new Error("ما في صورة");
  if (file.size > MAX_BYTES) throw new Error("الصورة كبيرة كتير");
  if (!/^image\/(jpeg|png|webp|gif|heic|heif|avif)$/.test(file.type)) throw new Error("نوع الملف لازم يكون صورة");

  const input = Buffer.from(await file.arrayBuffer());
  let output: Buffer;
  try {
    output = await sharp(input, { limitInputPixels: 40_000_000 })
      .rotate() // respect phone camera orientation
      .resize({ width: maxSize, height: maxSize, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
  } catch {
    throw new Error("ما قدرنا نقرأ الصورة، جرب صورة تانية");
  }

  const path = `${storeId}/${randomUUID()}.webp`;
  const { error } = await supabaseAdmin().storage.from(MEDIA_BUCKET).upload(path, output, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw new Error("ما قدرنا نرفع الصورة، جرب مرة تانية");
  return `/api/media/${path}`;
}

/** Deletes images that belong to this store (ignores anything else). */
export async function deleteImages(storeId: string, urls: string[]) {
  const paths = urls
    .filter((u) => u.startsWith(`/api/media/${storeId}/`))
    .map((u) => u.replace("/api/media/", ""));
  if (paths.length) await supabaseAdmin().storage.from(MEDIA_BUCKET).remove(paths);
}
