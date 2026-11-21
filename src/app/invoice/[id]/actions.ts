"use server";

import { randomBytes } from "node:crypto";
import { requireMerchant } from "@/lib/auth";
import { isPro } from "@/lib/plans";
import { supabaseAdmin } from "@/lib/supabase";

/** Link the customer can open without logging in. Made once per order. */
export async function invoiceLink(orderId: string): Promise<string | null> {
  const { store, db } = await requireMerchant();
  if (!isPro(store)) return null;
  const { data } = await db.from("orders").select("id, share_token").eq("id", orderId).eq("store_id", store.id).maybeSingle();
  if (!data) return null;
  let token = data.share_token as string | null;
  if (!token) {
    token = randomBytes(16).toString("hex");
    await supabaseAdmin().from("orders").update({ share_token: token }).eq("id", data.id);
  }
  return `/i/${token}`;
}
