import { hasSupabase, MEDIA_BUCKET, supabaseAdmin } from "@/lib/supabase";

// Serves store images through our own domain. Files never change (each upload
// gets a new name), so browsers and Vercel's CDN can keep them for a year.
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const key = path.join("/");
  if (!hasSupabase || !/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.webp$/.test(key)) {
    return new Response("Not found", { status: 404 });
  }
  const { data, error } = await supabaseAdmin().storage.from(MEDIA_BUCKET).download(key);
  if (error || !data) return new Response("Not found", { status: 404 });
  return new Response(data, {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
      "CDN-Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
