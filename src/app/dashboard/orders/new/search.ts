"use server";

import { requireMerchant } from "@/lib/auth";
import type { Customer, Product } from "@/lib/types";

export async function searchProducts(q: string): Promise<Product[]> {
  const { store, db } = await requireMerchant();
  const term = q.replace(/[%_,()]/g, "").trim().slice(0, 60);
  let query = db.from("products").select("id, title, price, images, stock, variants, options, active").eq("store_id", store.id);
  if (term) query = query.or(`title.ilike.%${term}%,sku.ilike.%${term}%`);
  const { data } = await query.order("created_at", { ascending: false }).limit(15);
  return ((data ?? []) as Product[]).map((p) => ({ ...p, price: Number(p.price) }));
}

export async function findCustomer(phone: string): Promise<Pick<Customer, "name" | "phone" | "city" | "address"> | null> {
  const { store, db } = await requireMerchant();
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 6) return null;
  const { data } = await db.from("customers").select("name, phone, city, address").eq("store_id", store.id).ilike("phone", `%${digits.slice(-8)}%`).limit(1).maybeSingle();
  return data as Pick<Customer, "name" | "phone" | "city" | "address"> | null;
}
