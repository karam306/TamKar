import { getStore, isDemoStore } from "@/lib/data";
import { hasSupabase, supabaseAdmin } from "@/lib/supabase";

const KINDS = ["page", "product", "cart", "checkout"];

// Counts store visits for the merchant's reports. Never fails loudly.
export async function POST(req: Request) {
  try {
    if (!hasSupabase) return new Response(null, { status: 204 });
    const ua = req.headers.get("user-agent") ?? "";
    if (/bot|crawler|spider|facebookexternalhit|preview/i.test(ua)) return new Response(null, { status: 204 });
    const body = (await req.json()) as { slug?: string; kind?: string; s?: boolean };
    if (!body.slug || !KINDS.includes(String(body.kind))) return new Response(null, { status: 204 });
    const store = await getStore(String(body.slug).slice(0, 60));
    if (!store || isDemoStore(store.id)) return new Response(null, { status: 204 });
    await supabaseAdmin().rpc("track_event", { p_store: store.id, p_kind: body.kind, p_new_session: body.s === true });
  } catch {}
  return new Response(null, { status: 204 });
}
