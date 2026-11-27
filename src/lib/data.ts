import "server-only";
import { liveFx, type Fx } from "./fx";
import { searchProducts } from "./search";
import { cache } from "react";
import { demoCollections, demoProducts, demoStores } from "./demo-data";
import { findVariant, hasVariants } from "./product-utils";
import { hasSupabase, supabaseAdmin, supabasePublic } from "./supabase";
import { templateMenus, templatePages } from "./business-templates";
import { isPro } from "./plans";
import { paymentChoices } from "./wallets";
import type {
  CartItem,
  Collection,
  Order,
  OrderLine,
  Pricing,
  Product,
  Store,
  StorePage,
  Fulfillment,
  Branch,
  PaymentMethod,
  GiftInfo,
} from "./types";

export const isDemoStore = (storeId: string) => storeId.startsWith("s-");

// Must match the columns granted to "anon" in supabase/schema.sql
const STORE_COLUMNS =
  "id, slug, name, tagline, logo_url, whatsapp, city, currency, theme, primary_color, sections, delivery_note, status, shipping, meta_pixel_id, plan, paid_until, business_type, menus, seo, social";
const PRODUCT_COLUMNS =
  "id, store_id, title, description, price, compare_at_price, images, category, stock, active, sku, options, variants, collection_ids, specs";

const num = (p: Product): Product => ({
  ...p,
  price: Number(p.price),
  compare_at_price:
    p.compare_at_price == null ? null : Number(p.compare_at_price),
});

/**
 * Finds a store by its key: a slug ("demo") or, when the key contains a dot,
 * a verified custom domain ("ahmadstore.com").
 */
export const getStore = cache(async (key: string): Promise<Store | null> => {
  const k = decodeURIComponent(key).toLowerCase();
  // Sample stores always exist, so the public demo keeps working.
  const demo = demoStores.find((s) => s.slug === k);
  if (demo)
    return {
      ...demo,
      menus:
        demo.menus ??
        templateMenus(templatePages(demo.business_type, demo.name)),
    };
  if (!hasSupabase) return null;
  const query = supabasePublic()
    .from("stores")
    .select(STORE_COLUMNS)
    .eq("status", "active");
  const { data, error } = k.includes(".")
    ? await query
        .eq("custom_domain", k)
        .eq("custom_domain_verified", true)
        .maybeSingle()
    : await query.eq("slug", k).maybeSingle();
  if (error) {
    console.error("getStore", error.message);
    return null;
  }
  return (data as Store) ?? null;
});

export type ProductQuery = {
  collectionId?: string;
  category?: string;
  q?: string;
  page?: number;
  perPage?: number;
};

/** Active products of a store, filtered and paged (stores can have thousands). */
export async function listProducts(
  storeId: string,
  f: ProductQuery = {},
): Promise<{ items: Product[]; total: number }> {
  const perPage = Math.min(f.perPage ?? 24, 100);
  const page = Math.max(1, f.page ?? 1);
  if (isDemoStore(storeId) || !hasSupabase) {
    let list = demoProducts.filter((p) => p.store_id === storeId && p.active);
    if (f.collectionId)
      list = list.filter((p) => p.collection_ids?.includes(f.collectionId!));
    if (f.category) list = list.filter((p) => p.category === f.category);
    if (f.q) list = searchProducts(list, f.q);
    return {
      items: list.slice((page - 1) * perPage, page * perPage),
      total: list.length,
    };
  }
  let q = supabasePublic()
    .from("products")
    .select(PRODUCT_COLUMNS, { count: "exact" })
    .eq("store_id", storeId)
    .eq("active", true);
  if (f.collectionId) q = q.contains("collection_ids", [f.collectionId]);
  if (f.category) q = q.eq("category", f.category);
  if (f.q) {
    // Smart search: load the store's products and rank them here, so spelling
    // differences, typos and synonyms still find the product (see lib/search.ts).
    const all: Product[] = [];
    for (let from = 0; from < 5000; from += 1000) {
      const { data, error } = await q.order("created_at", { ascending: false }).range(from, from + 999);
      if (error) {
        console.error("listProducts search", error.message);
        return { items: [], total: 0 };
      }
      all.push(...((data as Product[]) ?? []));
      if (!data || data.length < 1000) break;
    }
    const found = searchProducts(all, f.q);
    return { items: found.slice((page - 1) * perPage, page * perPage).map(num), total: found.length };
  }
  const { data, count, error } = await q
    .order("created_at", { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1);
  if (error) {
    console.error("listProducts", error.message);
    return { items: [], total: 0 };
  }
  return { items: ((data as Product[]) ?? []).map(num), total: count ?? 0 };
}

export const getProduct = cache(
  async (storeId: string, id: string): Promise<Product | null> => {
    if (isDemoStore(storeId) || !hasSupabase)
      return (
        demoProducts.find(
          (p) => p.store_id === storeId && p.id === id && p.active,
        ) ?? null
      );
    if (!/^[0-9a-f-]{36}$/.test(id)) return null;
    const { data } = await supabasePublic()
      .from("products")
      .select(PRODUCT_COLUMNS)
      .eq("store_id", storeId)
      .eq("id", id)
      .eq("active", true)
      .maybeSingle();
    return data ? num(data as Product) : null;
  },
);

/** Products for the cart page (only the ones in the cart). */
export async function getProductsByIds(
  storeId: string,
  ids: string[],
): Promise<Product[]> {
  const unique = [...new Set(ids)].slice(0, 100);
  if (unique.length === 0) return [];
  if (isDemoStore(storeId) || !hasSupabase)
    return demoProducts.filter(
      (p) => p.store_id === storeId && unique.includes(p.id),
    );
  const valid = unique.filter((id) => /^[0-9a-f-]{36}$/.test(id));
  if (!valid.length) return [];
  const { data } = await supabasePublic()
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("store_id", storeId)
    .eq("active", true)
    .in("id", valid);
  return ((data as Product[]) ?? []).map(num);
}

export const getCollections = cache(
  async (storeId: string): Promise<Collection[]> => {
    if (isDemoStore(storeId) || !hasSupabase)
      return demoCollections.filter((c) => c.store_id === storeId);
    const { data } = await supabasePublic()
      .from("collections")
      .select("*")
      .eq("store_id", storeId)
      .order("created_at");
    return (data as Collection[]) ?? [];
  },
);

export const getCategories = cache(
  async (storeId: string): Promise<string[]> => {
    if (isDemoStore(storeId) || !hasSupabase) {
      return [
        ...new Set(
          demoProducts
            .filter((p) => p.store_id === storeId && p.category)
            .map((p) => p.category!),
        ),
      ];
    }
    const { data } = await supabasePublic()
      .from("products")
      .select("category")
      .eq("store_id", storeId)
      .eq("active", true)
      .not("category", "is", null)
      .limit(5000);
    return [...new Set((data ?? []).map((r) => r.category as string))].slice(
      0,
      30,
    );
  },
);

const clean = (v: unknown, max: number) =>
  typeof v === "string"
    ? v
        .replace(/[\u0000-\u001f]/g, " ")
        .trim()
        .slice(0, max)
    : "";

export type CustomerInput = {
  name: string;
  phone: string;
  city: string;
  address: string;
  notes?: string;
  method?: Fulfillment;
  branch?: string;
  payment?: PaymentMethod;
  gift?: GiftInfo | null;
};

export type CreateOrderResult =
  | {
      ok: true;
      order: Pick<
        Order,
        | "id"
        | "number"
        | "items"
        | "total"
        | "customer_name"
        | "phone"
        | "city"
        | "address"
        | "notes"
      > & {
        subtotal: number;
        discount: number;
        shipping: number;
        discount_code: string | null;
        fulfillment: Fulfillment;
        /** Pickup branch, when the store has more than one. */
        branch?: Branch | null;
        payment_method: PaymentMethod;
        gift?: GiftInfo | null;
        fx?: Fx | null;
      };
    }
  | { ok: false; error: string };

export function validateCustomer(
  input: CustomerInput,
):
  | {
      ok: true;
      value: Required<Omit<CustomerInput, "branch" | "payment" | "gift">>;
    }
  | { ok: false; error: string } {
  const method: Fulfillment =
    input.method === "delivery" ? "delivery" : "pickup";
  const name = clean(input.name, 80);
  const phone = clean(input.phone, 20).replace(/[^\d+]/g, "");
  const city = clean(input.city, 60);
  const address = clean(input.address, 300);
  const notes = clean(input.notes, 500);
  if (name.length < 2) return { ok: false, error: "يُرجى إدخال الاسم" };
  if (phone.replace(/\D/g, "").length < 9)
    return { ok: false, error: "رقم الهاتف غير صحيح" };
  if (method === "delivery" && (!city || address.length < 4))
    return { ok: false, error: "يُرجى إدخال المدينة والعنوان بالتفصيل" };
  return { ok: true, value: { name, phone, city, address, notes, method } };
}

/** Turns database error codes from place_order into a message for people. */
function orderError(message: string): string {
  const at = message.indexOf(":");
  const code = at === -1 ? message : message.slice(0, at);
  const detail = at === -1 ? "" : message.slice(at + 1);
  switch (code) {
    case "OUT_OF_STOCK":
      return `الكمية المطلوبة من "${detail?.trim()}" غير متوفرة`;
    case "NOT_AVAILABLE":
      return `المنتج "${detail?.trim()}" لم يعد متوفراً`;
    case "VARIANT_REQUIRED":
      return `اختر المقاس أو اللون للمنتج "${detail?.trim()}"`;
    case "EMPTY":
      return "السلة فارغة";
    case "BAD_CODE":
      return "رمز الخصم غير صحيح";
    case "CODE_EXPIRED":
      return "انتهت صلاحية رمز الخصم";
    case "CODE_USED_UP":
      return "استُنفد استخدام رمز الخصم";
    case "NO_DELIVERY":
      return "لا يوفّر هذا المتجر خدمة التوصيل، الاستلام من المحل فقط";
    case "CODE_DELIVERY_ONLY":
      return "هذا الرمز للتوصيل المجاني، ويعمل فقط عند اختيار التوصيل";
    case "CODE_MIN":
      return `يسري رمز الخصم على الطلبات بقيمة ${detail} فأكثر`;
    default:
      return "حدث خطأ، حاول مرة أخرى";
  }
}

/** Delivery fee and discount for demo stores (no database). */
function demoPricing(
  store: Store,
  subtotal: number,
  city: string,
  code?: string,
  pickup = true,
): Pricing | { error: string } {
  if (code?.trim()) return { error: orderError("BAD_CODE") };
  const ship = store.shipping ?? {};
  if (pickup)
    return { subtotal, discount: 0, shipping: 0, total: subtotal, code: null };
  if (!ship.delivery) return { error: orderError("NO_DELIVERY") };
  let fee =
    ship.rates?.find((r) => r.city.trim() === city.trim())?.fee ??
    ship.default_fee ??
    0;
  if (ship.free_over != null && subtotal >= ship.free_over) fee = 0;
  return {
    subtotal,
    discount: 0,
    shipping: fee,
    total: subtotal + fee,
    code: null,
  };
}

/** Discount and delivery fee for the cart preview, using the same rules as checkout. */
export async function quote(
  store: Store,
  subtotal: number,
  city: string,
  code?: string,
  method: Fulfillment = "pickup",
): Promise<Pricing | { error: string }> {
  const pickup = method !== "delivery";
  if (!hasSupabase || isDemoStore(store.id))
    return demoPricing(store, subtotal, city, code, pickup);
  const { data, error } = await supabaseAdmin().rpc("order_pricing", {
    p_store: store.id,
    p_subtotal: subtotal,
    p_city: city,
    p_code: code?.trim() || null,
    p_use: false,
    p_pickup: pickup,
  });
  if (error || !data) return { error: orderError(error?.message ?? "") };
  const d = data as {
    discount: number;
    shipping: number;
    code: string | null;
    free_shipping: boolean;
  };
  const discount = Number(d.discount);
  const shipping = Number(d.shipping);
  return {
    subtotal,
    discount,
    shipping,
    total: subtotal - discount + shipping,
    code: d.code,
    free_shipping: d.free_shipping,
  };
}

/**
 * Saves an order. Prices and stock are checked in the database, never taken
 * from the browser, and stock is deducted in the same step.
 */
/** Keeps the gift details only when the store allows gifts and this is a delivery order. */
function cleanGift(
  store: Store,
  method: Fulfillment,
  g?: GiftInfo | null,
): GiftInfo | null | "missing" {
  if (
    !g ||
    method !== "delivery" ||
    !store.shipping?.delivery ||
    !store.shipping?.gift
  )
    return null;
  const to_name = String(g.to_name ?? "")
    .trim()
    .slice(0, 80);
  if (to_name.length < 2) return "missing";
  return {
    to_name,
    to_phone:
      String(g.to_phone ?? "")
        .replace(/[^\d+]/g, "")
        .slice(0, 20) || null,
    message:
      String(g.message ?? "")
        .trim()
        .slice(0, 300) || null,
    hide_prices: Boolean(g.hide_prices),
  };
}

export async function createOrder(
  store: Store,
  customer: CustomerInput,
  items: CartItem[],
  source: "online" | "manual" = "online",
  discountCode?: string,
): Promise<CreateOrderResult> {
  const c = validateCustomer(customer);
  if (!c.ok) return c;
  const branch: Branch | null =
    c.value.method === "pickup" && customer.branch && isPro(store)
      ? ((store.shipping?.branches ?? []).find(
          (b) => b.id === customer.branch,
        ) ?? null)
      : null;
  const clean = (Array.isArray(items) ? items : [])
    .slice(0, 50)
    .map((i) => ({
      productId: String(i.productId),
      variantId: i.variantId ? String(i.variantId) : undefined,
      qty: Math.floor(Number(i.qty)),
    }))
    .filter((i) => Number.isFinite(i.qty) && i.qty >= 1 && i.qty <= 999);
  if (clean.length === 0) return { ok: false, error: "السلة فارغة" };
  const choices = paymentChoices(store);
  const payment: PaymentMethod =
    customer.payment && choices.includes(customer.payment)
      ? customer.payment
      : choices[0];
  const gift = cleanGift(store, c.value.method, customer.gift);
  if (gift === "missing")
    return { ok: false, error: "أدخل اسم مستلم الهدية" };

  if (!hasSupabase || isDemoStore(store.id)) {
    // Demo stores: nothing is saved.
    const lines: OrderLine[] = [];
    for (const i of clean) {
      const p = demoProducts.find(
        (x) => x.id === i.productId && x.store_id === store.id,
      );
      if (!p) continue;
      const v = findVariant(p, i.variantId);
      if (hasVariants(p) && !v)
        return { ok: false, error: orderError(`VARIANT_REQUIRED:${p.title}`) };
      lines.push({
        productId: p.id,
        variantId: v?.id,
        title: p.title,
        variantTitle: v?.title,
        price: v?.price ?? p.price,
        qty: i.qty,
      });
    }
    if (!lines.length) return { ok: false, error: "السلة فارغة" };
    const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
    const v = c.value;
    const pr = demoPricing(
      store,
      subtotal,
      v.city,
      discountCode,
      v.method === "pickup",
    );
    if ("error" in pr) return { ok: false, error: pr.error };
    return {
      ok: true,
      order: {
        id: "demo",
        number: 1000 + Math.floor(Math.random() * 9000),
        items: lines,
        total: pr.total,
        subtotal,
        discount: 0,
        shipping: pr.shipping,
        discount_code: null,
        fulfillment: v.method,
        branch,
        payment_method: payment,
        gift,
        customer_name: v.name,
        phone: v.phone,
        city: v.city,
        address: v.address,
        notes: v.notes || null,
      },
    };
  }

  const v = c.value;
  const { data, error } = await supabaseAdmin().rpc("place_order", {
    p_store: store.id,
    p_customer: {
      name: v.name,
      phone: v.phone,
      city: v.method === "delivery" ? v.city : "",
      address: v.method === "delivery" ? v.address : "",
      method: v.method,
    },
    p_items: clean,
    p_source: source,
    p_note: v.notes || null,
    p_discount_code: discountCode?.trim() || null,
  });
  if (error || !data) {
    console.error("createOrder", error?.message);
    return { ok: false, error: orderError(error?.message ?? "") };
  }
  const orderId = (data as { id: string }).id;
  if (branch)
    await supabaseAdmin()
      .from("orders")
      .update({ branch: branch.name })
      .eq("id", orderId);
  if (payment !== "cod") {
    // Needs update 009 in Supabase; the order is saved either way.
    const { error: payError } = await supabaseAdmin()
      .from("orders")
      .update({ payment_method: payment })
      .eq("id", orderId);
    if (payError)
      console.error(
        "payment_method not saved (run 009_payments.sql)",
        payError.message,
      );
  }
  const fx = liveFx(store);
  if (fx) {
    // Keep the rate the customer saw, so the invoice matches later rate changes.
    const { error: fxError } = await supabaseAdmin()
      .from("orders")
      .update({ fx })
      .eq("id", orderId);
    if (fxError) console.error("fx not saved (run 013)", fxError.message);
  }
  if (gift) {
    const { error: giftError } = await supabaseAdmin()
      .from("orders")
      .update({ gift })
      .eq("id", orderId);
    if (giftError) console.error("gift not saved (run 011)", giftError.message);
  }
  const r = data as {
    id: string;
    number: number;
    total: number;
    subtotal: number;
    discount: number;
    shipping: number;
    discount_code: string | null;
    items: OrderLine[];
  };
  return {
    ok: true,
    order: {
      id: r.id,
      number: r.number,
      items: r.items,
      total: Number(r.total),
      subtotal: Number(r.subtotal),
      discount: Number(r.discount),
      shipping: Number(r.shipping),
      discount_code: r.discount_code,
      fulfillment: v.method,
      branch,
      payment_method: payment,
      gift,
      fx,
      customer_name: v.name,
      phone: v.phone,
      city: v.city,
      address: v.address,
      notes: v.notes || null,
    },
  };
}

export const getPages = cache(async (storeId: string): Promise<StorePage[]> => {
  if (isDemoStore(storeId) || !hasSupabase) {
    const store = demoStores.find((s) => s.id === storeId);
    return store
      ? templatePages(store.business_type, store.name).map((p) => ({
          ...p,
          id: p.handle,
          store_id: storeId,
          published: true,
        }))
      : [];
  }
  const { data } = await supabasePublic()
    .from("pages")
    .select("id, store_id, title, handle, body, published")
    .eq("store_id", storeId)
    .eq("published", true);
  return (data as StorePage[]) ?? [];
});
