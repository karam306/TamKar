import "server-only";
import { cache } from "react";
import { demoProducts, demoStores } from "./demo-data";
import { hasSupabase, supabaseAdmin, supabasePublic } from "./supabase";
import type { Order, OrderInput, OrderLine, Product, Store } from "./types";

// Must match the columns granted to "anon" in supabase/schema.sql
const STORE_COLUMNS =
  "id, slug, name, tagline, logo_url, whatsapp, city, currency, theme, primary_color, sections, delivery_note, status";
const PRODUCT_COLUMNS = "id, store_id, title, description, price, compare_at_price, images, category, stock, active";

/**
 * Finds a store by its key: a slug ("demo") or, when the key contains a dot,
 * a verified custom domain ("ahmadstore.com").
 */
export const getStore = cache(async (key: string): Promise<Store | null> => {
  const k = decodeURIComponent(key).toLowerCase();
  if (!hasSupabase) {
    return demoStores.find((s) => s.slug === k) ?? null;
  }
  const query = supabasePublic().from("stores").select(STORE_COLUMNS).eq("status", "active");
  const { data, error } = k.includes(".")
    ? await query.eq("custom_domain", k).eq("custom_domain_verified", true).maybeSingle()
    : await query.eq("slug", k).maybeSingle();
  if (error) {
    console.error("getStore", error.message);
    return null;
  }
  return (data as Store) ?? null;
});

export const getProducts = cache(async (storeId: string): Promise<Product[]> => {
  if (!hasSupabase) return demoProducts.filter((p) => p.store_id === storeId && p.active);
  const { data, error } = await supabasePublic()
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("store_id", storeId)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) {
    console.error("getProducts", error.message);
    return [];
  }
  return (data as Product[]) ?? [];
});

export async function getProduct(storeId: string, id: string): Promise<Product | null> {
  const all = await getProducts(storeId);
  return all.find((p) => p.id === id) ?? null;
}

export function categoriesOf(products: Product[]): string[] {
  return [...new Set(products.map((p) => p.category).filter(Boolean) as string[])];
}

const clean = (v: unknown, max: number) =>
  typeof v === "string" ? v.replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max) : "";

export type CreateOrderResult =
  | { ok: true; order: Pick<Order, "number" | "items" | "total" | "customer_name" | "phone" | "city" | "address" | "notes"> }
  | { ok: false; error: string };

/**
 * Validates the cart against the store's real prices (never trusts prices
 * from the browser) and saves the order.
 */
export async function createOrder(store: Store, input: OrderInput): Promise<CreateOrderResult> {
  const customer_name = clean(input.customerName, 80);
  const phone = clean(input.phone, 20).replace(/[^\d+]/g, "");
  const city = clean(input.city, 60);
  const address = clean(input.address, 300);
  const notes = clean(input.notes, 500) || null;

  if (customer_name.length < 2) return { ok: false, error: "اكتب اسمك من فضلك" };
  if (phone.replace(/\D/g, "").length < 9) return { ok: false, error: "رقم الهاتف غير صحيح" };
  if (!city || address.length < 4) return { ok: false, error: "اكتب المدينة والعنوان بالتفصيل" };
  if (!Array.isArray(input.items) || input.items.length === 0 || input.items.length > 50) {
    return { ok: false, error: "السلة فاضية" };
  }

  const products = await getProducts(store.id);
  const lines: OrderLine[] = [];
  for (const item of input.items) {
    const product = products.find((p) => p.id === item.productId);
    const qty = Math.floor(Number(item.qty));
    if (!product || !Number.isFinite(qty) || qty < 1 || qty > 99) continue;
    if (product.stock != null && product.stock < qty) {
      return { ok: false, error: `الكمية المطلوبة من "${product.title}" غير متوفرة` };
    }
    lines.push({ productId: product.id, title: product.title, price: product.price, qty });
  }
  if (lines.length === 0) return { ok: false, error: "المنتجات بالسلة لم تعد متوفرة" };

  const total = Math.round(lines.reduce((s, l) => s + l.price * l.qty, 0) * 100) / 100;
  const base = { customer_name, phone, city, address, notes, items: lines, total };

  if (!hasSupabase) {
    // Demo mode: nothing is saved.
    return { ok: true, order: { ...base, number: 1000 + Math.floor(Math.random() * 9000) } };
  }

  const { data, error } = await supabaseAdmin()
    .from("orders")
    .insert({ store_id: store.id, ...base })
    .select("number")
    .single();
  if (error || !data) {
    console.error("createOrder", error?.message);
    return { ok: false, error: "صار خطأ، جرب مرة تانية" };
  }
  return { ok: true, order: { ...base, number: data.number as number } };
}
