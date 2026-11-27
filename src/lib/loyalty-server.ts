import "server-only";
import { liveLoyalty, pointsFor, WALK_IN_PHONE } from "./loyalty";
import { supabaseAdmin } from "./supabase";
import { normalizeWhatsapp } from "./templates";
import type { Store } from "./types";

/** Gives the points for a delivered order, once. Silent when loyalty is off or before update 015. */
export async function awardPoints(
  store: Pick<Store, "id" | "shipping">,
  o: { id: string; phone: string; total: number | string; refunded?: number | string | null },
): Promise<void> {
  const l = liveLoyalty(store);
  if (!l || !o.phone || o.phone === WALK_IN_PHONE) return;
  const points = pointsFor(Number(o.total) - Number(o.refunded ?? 0), l);
  if (points <= 0) return;
  const { error } = await supabaseAdmin().from("loyalty_points").insert({
    store_id: store.id,
    phone: normalizeWhatsapp(o.phone),
    points,
    order_id: o.id,
    note: "نقاط طلب",
  });
  // 23505 = already earned for this order.
  if (error && error.code !== "23505") console.error("awardPoints", error.message);
}

/** A customer's balance and history (newest first). null before update 015. */
export async function pointsOf(storeId: string, phone: string) {
  const { data, error } = await supabaseAdmin()
    .from("loyalty_points")
    .select("id, points, note, order_id, created_at")
    .eq("store_id", storeId)
    .eq("phone", normalizeWhatsapp(phone))
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return null;
  const rows = data ?? [];
  return { balance: rows.reduce((s, r) => s + Number(r.points), 0), rows };
}
