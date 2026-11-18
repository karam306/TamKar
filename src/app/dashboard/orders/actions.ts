"use server";

import { revalidatePath } from "next/cache";
import { requireMerchant } from "@/lib/auth";

const ALLOWED = ["new", "confirmed", "delivered", "cancelled"];

export async function setOrderStatus(form: FormData) {
  const { store, db } = await requireMerchant();
  const id = String(form.get("id") ?? "");
  const status = String(form.get("status") ?? "");
  if (!ALLOWED.includes(status)) return;
  // Row Level Security also blocks changes to other stores' orders.
  await db.from("orders").update({ status }).eq("id", id).eq("store_id", store.id);
  revalidatePath("/dashboard", "layout");
}
