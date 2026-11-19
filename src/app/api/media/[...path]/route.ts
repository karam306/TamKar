import sharp from "sharp";
import { hasSupabase, MEDIA_BUCKET, supabaseAdmin } from "@/lib/supabase";

// Serves store images through our own domain. Files never change (each upload
// gets a new name), so browsers and Vercel's CDN can keep them for a year.
// ?f=jpg returns a JPEG copy (for Meta catalogs and older apps).
export async function GET(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const key = path.join("/");
  if (!hasSupabase || !/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.webp$/.test(key)) {
    return new Response("Not found", { status: 404 });
  }
  const { data, error } = await supabaseAdmin().storage.from(MEDIA_BUCKET).download(key);
  if (error || !data) return new Response("Not found", { status: 404 });
  const jpg = new URL(req.url).searchParams.get("f") === "jpg";
  const body = jpg ? new Uint8Array(await sharp(Buffer.from(await data.arrayBuffer())).flatten({ background: "#ffffff" }).jpeg({ quality: 85 }).toBuffer()) : data;
  return new Response(body, {
    headers: {
      "Content-Type": jpg ? "image/jpeg" : "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
      "CDN-Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
