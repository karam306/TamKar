import "server-only";
import { revalidatePath } from "next/cache";
import { cleanVariants, txt } from "../clean-product";
import { cleanSections } from "../clean-sections";
import { liveFx, FX_ROUND_STEPS } from "../fx";
import { awardPoints } from "../loyalty-server";
import { saveImageBuffer } from "../media";
import { cleanOffers } from "../offers";
import { limits } from "../plans";
import { supabaseAdmin } from "../supabase";
import type { Order, Product, Store } from "../types";
import { storeUrl } from "../urls";

/**
 * Tools for the Kun admin connector. Every tool runs with full platform access
 * (service role), so each one checks its input and touches only the store it names.
 */

type Json = Record<string, unknown>;
export type Tool = {
  name: string;
  description: string;
  inputSchema: Json;
  /** Tools that change data. Read-only tools are marked so Claude can call them freely. */
  write?: boolean;
  run: (args: Json) => Promise<unknown>;
  /** Which store the call was about (for the log). */
};

export class ToolError extends Error {}
const fail = (m: string): never => {
  throw new ToolError(m);
};

const db = () => supabaseAdmin();
const STORE = { store: { type: "string", description: "Store slug (the part before .kunstores.com), e.g. yasmine-sweets" } };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const num = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number(v));
const int = (v: unknown, def: number, max: number) => Math.min(max, Math.max(1, Math.floor(Number(v ?? def)) || def));

/** Last store a tool touched, read by the route for the log. */
export let lastStoreId: string | null = null;
export function resetLastStore() {
  lastStoreId = null;
}

async function storeOf(args: Json): Promise<Store> {
  const slug = String(args.store ?? "").trim().toLowerCase();
  if (!slug) fail("Missing 'store' (the store slug). Use list_stores to find it.");
  const { data } = await db().from("stores").select("*").eq("slug", slug).maybeSingle();
  if (!data) fail(`No store with slug "${slug}". Use list_stores to find the right one.`);
  lastStoreId = (data as Store).id;
  return data as Store;
}

/** Storefront pages read fresh data after a change. */
function refreshStore(s: Store) {
  try {
    revalidatePath(`/s/${s.slug}`, "layout");
    revalidatePath("/dashboard", "layout");
  } catch {}
}

async function productOf(s: Store, id: unknown): Promise<Product> {
  if (!UUID.test(String(id ?? ""))) fail("Missing or invalid product 'id'. Use list_products to find it.");
  const { data } = await db().from("products").select("*").eq("id", String(id)).eq("store_id", s.id).maybeSingle();
  if (!data) fail("Product not found in this store.");
  return data as Product;
}

const productSummary = (p: Product) => ({
  id: p.id,
  title: p.title,
  price: Number(p.price),
  compare_at_price: p.compare_at_price == null ? null : Number(p.compare_at_price),
  stock: p.stock,
  active: p.active,
  category: p.category,
  sku: p.sku,
  variants: (p.variants ?? []).length,
  image: p.images?.[0] ?? null,
});

/** Builds a product row from tool input, with the same rules as the dashboard form. */
async function productRow(s: Store, a: Json, old?: Product) {
  const pick = <T>(k: string, fallback: T): T => (k in a ? (a[k] as T) : fallback);
  const title = txt(pick("title", old?.title ?? ""), 200);
  if (!title) fail("A product needs a 'title'.");
  const v = cleanVariants(pick("options", old?.options ?? []), pick("variants", old?.variants ?? []));
  if ("error" in v) fail(v.error);
  const { options, variants } = v as Exclude<typeof v, { error: string }>;
  const withVariants = variants.length > 0;
  let price = num(pick("price", old?.price ?? null));
  if (withVariants) price = Math.min(...variants.map((x) => x.price));
  if (price === null || !Number.isFinite(price) || price < 0) fail("Give a valid 'price' (a number, 0 or more).");
  const compare = num(pick("compare_at_price", old?.compare_at_price ?? null));
  const stock = num(pick("stock", old?.stock ?? null));
  if (stock !== null && (!Number.isFinite(stock) || stock < 0)) fail("'stock' must be 0 or more, or null for unlimited.");
  const images = (pick("images", old?.images ?? []) as unknown[])
    .map(String)
    .filter((u) => u.startsWith(`/api/media/${s.id}/`) || /^\/demo\/[a-z0-9-]+\.svg$/.test(u))
    .slice(0, 10);
  const wanted = (pick("collection_ids", old?.collection_ids ?? []) as unknown[]).map(String).filter((x) => UUID.test(x));
  const { data: own } = wanted.length
    ? await db().from("collections").select("id").eq("store_id", s.id).in("id", wanted)
    : { data: [] as { id: string }[] };
  const specs = (pick("specs", old?.specs ?? []) as { name?: unknown; value?: unknown }[])
    .map((x) => ({ name: txt(x?.name, 40), value: txt(x?.value, 200) }))
    .filter((x) => x.name && x.value)
    .slice(0, 30);
  return {
    store_id: s.id,
    title,
    description: txt(pick("description", old?.description ?? ""), 5000) || null,
    price: price as number,
    compare_at_price: !withVariants && compare && compare > (price as number) ? compare : null,
    category: txt(pick("category", old?.category ?? ""), 60) || null,
    sku: withVariants ? null : txt(pick("sku", old?.sku ?? ""), 60) || null,
    stock: withVariants || stock === null ? null : Math.floor(stock),
    active: Boolean(pick("active", old?.active ?? true)),
    images,
    options,
    variants,
    specs,
    collection_ids: (own ?? []).map((c) => c.id as string),
  };
}

const PRODUCT_FIELDS = {
  title: { type: "string" },
  description: { type: "string", description: "Plain text, up to 5000 characters" },
  price: { type: "number", description: "In the store's currency (see get_store). Ignored when variants are given: the lowest variant price is used." },
  compare_at_price: { type: ["number", "null"], description: "Old price shown struck through; must be higher than price" },
  stock: { type: ["integer", "null"], description: "null = unlimited / not tracked" },
  sku: { type: "string" },
  category: { type: "string", description: "Product type, shown as a filter" },
  active: { type: "boolean", description: "false = draft, hidden from the store" },
  images: { type: "array", items: { type: "string" }, description: "Image paths from import_image (/api/media/...). Max 10, first is the main one." },
  options: {
    type: "array",
    description: "Up to 3 options, e.g. [{name:'المقاس', values:['S','M']}]",
    items: { type: "object", properties: { name: { type: "string" }, values: { type: "array", items: { type: "string" } } } },
  },
  variants: {
    type: "array",
    description: "One per combination of option values, in option order: [{options:['S'], price, compare_at_price?, stock?, sku?}]",
    items: { type: "object" },
  },
  specs: { type: "array", description: "[{name, value}] details table", items: { type: "object" } },
  collection_ids: { type: "array", items: { type: "string" } },
  qty_prices: {
    type: "array",
    description: "Quantity offers: [{min: 3, off: 10}] = 10% off each piece from 3 pieces (all variants count together)",
    items: { type: "object", properties: { min: { type: "integer" }, off: { type: "number" } } },
  },
};

async function saveOffersFor(s: Store, id: string, raw: unknown) {
  if (raw === undefined) return null;
  const offers = cleanOffers(raw);
  const { error } = await db().from("products").update({ qty_prices: offers }).eq("id", id).eq("store_id", s.id);
  return error ? "Quantity offers need database update 015." : null;
}

const day = (d: Date) => d.toISOString().slice(0, 10);

export const TOOLS: Tool[] = [
  // ───────────── Platform ─────────────
  {
    name: "platform_overview",
    description: "Kun platform summary: number of stores by plan and status, trials ending in the next 7 days, stores that signed up in the last 7 days, and orders across all stores in the last 30 days.",
    inputSchema: { type: "object", properties: {} },
    async run() {
      const { data: stores } = await db().from("stores").select("id, slug, name, plan, status, paid_until, created_at");
      const all = stores ?? [];
      const now = Date.now();
      const by = (k: "plan" | "status") => all.reduce<Record<string, number>>((m, s) => ((m[s[k] as string] = (m[s[k] as string] ?? 0) + 1), m), {});
      const soon = all.filter((s) => s.paid_until && new Date(s.paid_until as string).getTime() - now < 7 * 864e5 && new Date(s.paid_until as string).getTime() > now - 864e5);
      const fresh = all.filter((s) => now - new Date(s.created_at as string).getTime() < 7 * 864e5);
      const { count } = await db().from("orders").select("id", { count: "exact", head: true }).gte("created_at", new Date(now - 30 * 864e5).toISOString());
      return {
        stores: all.length,
        by_plan: by("plan"),
        by_status: by("status"),
        ending_within_7_days: soon.map((s) => ({ slug: s.slug, name: s.name, plan: s.plan, paid_until: s.paid_until })),
        new_last_7_days: fresh.map((s) => ({ slug: s.slug, name: s.name, created_at: s.created_at })),
        orders_last_30_days: count ?? 0,
      };
    },
  },
  {
    name: "list_stores",
    description: "List Kun stores (slug, name, plan, status, paid until, city, link). Optional search by name or slug.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, limit: { type: "integer", default: 50 } } },
    async run(a) {
      let q = db().from("stores").select("slug, name, plan, status, paid_until, city, currency, created_at").order("created_at", { ascending: false }).limit(int(a.limit, 50, 500));
      const query = String(a.query ?? "").trim();
      if (query) q = q.or(`name.ilike.%${query.replace(/[%,()]/g, "")}%,slug.ilike.%${query.replace(/[%,()]/g, "")}%`);
      const { data } = await q;
      return (data ?? []).map((s) => ({ ...s, url: storeUrl(s.slug as string) }));
    },
  },
  {
    name: "get_store",
    description: "Everything about one store: details, currency, theme and colour, home page sections, menus, delivery/pickup, payments, branches, exchange rate, loyalty, plan, and counts of products/orders/customers.",
    inputSchema: { type: "object", properties: { ...STORE }, required: ["store"] },
    async run(a) {
      const s = await storeOf(a);
      const count = async (t: string) => (await db().from(t).select("id", { count: "exact", head: true }).eq("store_id", s.id)).count ?? 0;
      const [products, orders, customers] = await Promise.all([count("products"), count("orders"), count("customers")]);
      return { ...s, url: storeUrl(s.slug), counts: { products, orders, customers } };
    },
  },
  {
    name: "update_store",
    description: "Change a store's details. Only the fields you pass change. Arabic text should be calm Modern Standard Arabic.",
    write: true,
    inputSchema: {
      type: "object",
      properties: {
        ...STORE,
        name: { type: "string" },
        tagline: { type: "string" },
        city: { type: "string" },
        whatsapp: { type: "string", description: "With country code, digits only, e.g. 963912345678" },
        delivery_note: { type: "string" },
        theme: { type: "string", enum: ["classic", "bold", "soft"] },
        primary_color: { type: ["string", "null"], description: "Hex colour like #2f5d50, or null for the theme default" },
        currency: { type: "string", enum: ["USD", "SYP"], description: "Careful: prices are not converted." },
        logo_url: { type: ["string", "null"], description: "A path from import_image, or null to remove" },
        social: { type: "object", description: "{instagram, facebook, tiktok, telegram}: full links" },
        menus: { type: "object", description: "{header:[{label, href}], footer:[{label, href}]}; href like /products, /pages/about, /collections/x" },
      },
      required: ["store"],
    },
    async run(a) {
      const s = await storeOf(a);
      const patch: Json = {};
      const str = (k: string, max: number) => k in a && (patch[k] = txt(a[k], max) || null);
      str("tagline", 160);
      str("city", 60);
      str("delivery_note", 200);
      if ("name" in a) patch.name = txt(a.name, 60) || fail("'name' cannot be empty.");
      if ("whatsapp" in a) {
        const w = String(a.whatsapp).replace(/\D/g, "");
        if (!/^\d{9,15}$/.test(w)) fail("'whatsapp' must be 9 to 15 digits with the country code.");
        patch.whatsapp = w;
      }
      if ("theme" in a) patch.theme = ["classic", "bold", "soft"].includes(String(a.theme)) ? a.theme : fail("Unknown theme.");
      if ("primary_color" in a) patch.primary_color = a.primary_color === null ? null : /^#[0-9a-f]{6}$/i.test(String(a.primary_color)) ? a.primary_color : fail("Colour must look like #2f5d50.");
      if ("currency" in a) patch.currency = ["USD", "SYP"].includes(String(a.currency)) ? a.currency : fail("Currency must be USD or SYP.");
      if ("logo_url" in a) patch.logo_url = a.logo_url === null ? null : String(a.logo_url).startsWith(`/api/media/${s.id}/`) ? a.logo_url : fail("Logo must be a path from import_image for this store.");
      if ("social" in a && a.social && typeof a.social === "object")
        patch.social = Object.fromEntries(Object.entries(a.social as Json).filter(([k, v]) => ["instagram", "facebook", "tiktok", "telegram", "youtube", "x"].includes(k) && /^https:\/\//.test(String(v))).map(([k, v]) => [k, String(v).slice(0, 200)]));
      if ("menus" in a && a.menus && typeof a.menus === "object") {
        const clean = (list: unknown) => (Array.isArray(list) ? list : []).slice(0, 12).map((l: Json) => ({ label: txt(l?.label, 40), href: txt(l?.href, 200) })).filter((l) => l.label && /^(\/|https:\/\/)/.test(l.href));
        const m = a.menus as Json;
        patch.menus = { header: clean(m.header), footer: clean(m.footer) };
      }
      if (!Object.keys(patch).length) fail("Nothing to change: pass at least one field.");
      const { error } = await db().from("stores").update(patch).eq("id", s.id);
      if (error) fail(error.message);
      refreshStore(s);
      return { ok: true, changed: Object.keys(patch) };
    },
  },
  {
    name: "update_store_settings",
    description:
      "Change ordering settings (merged into what exists): delivery on/off, default_fee, free_over, rates [{city, fee}], pickup_note, gift (true/false), payments {cod, wallets:[{id: sham_cash|syriatel_cash|mtn_cash, account, holder?}]}, branches [{name, note, whatsapp}] (Pro), loyalty {enabled, per, block, reward}.",
    write: true,
    inputSchema: { type: "object", properties: { ...STORE, settings: { type: "object" } }, required: ["store", "settings"] },
    async run(a) {
      const s = await storeOf(a);
      const inp = (a.settings ?? {}) as Json;
      const allowed = ["delivery", "default_fee", "free_over", "rates", "pickup_note", "gift", "payments", "branches", "loyalty"];
      const bad = Object.keys(inp).filter((k) => !allowed.includes(k));
      if (bad.length) fail(`Unknown settings: ${bad.join(", ")}. Allowed: ${allowed.join(", ")}.`);
      const next = { ...(s.shipping ?? {}), ...inp } as Json;
      if ("delivery" in inp) next.delivery = Boolean(inp.delivery);
      if ("gift" in inp) next.gift = Boolean(inp.gift);
      for (const k of ["default_fee", "free_over"]) if (k in inp) next[k] = num(inp[k]);
      if ("pickup_note" in inp) next.pickup_note = txt(inp.pickup_note, 200) || null;
      if ("rates" in inp) next.rates = (Array.isArray(inp.rates) ? inp.rates : []).slice(0, 100).map((r: Json) => ({ city: txt(r.city, 60), fee: Number(r.fee) || 0 })).filter((r) => r.city);
      if ("branches" in inp)
        next.branches = (Array.isArray(inp.branches) ? inp.branches : []).slice(0, 4).map((b: Json, i: number) => {
          const w = String(b.whatsapp ?? "").replace(/\D/g, "");
          if (!/^\d{9,15}$/.test(w)) fail(`Branch ${i + 1}: WhatsApp must be 9 to 15 digits with country code.`);
          return { id: txt(b.id, 12) || Math.random().toString(36).slice(2, 10), name: txt(b.name, 60) || fail(`Branch ${i + 1} needs a name.`), note: txt(b.note, 200) || null, whatsapp: w };
        });
      if ("payments" in inp) {
        const p = (inp.payments ?? {}) as Json;
        next.payments = {
          cod: p.cod !== false,
          wallets: (Array.isArray(p.wallets) ? p.wallets : [])
            .filter((w: Json) => ["sham_cash", "syriatel_cash", "mtn_cash"].includes(String(w.id)) && txt(w.account, 80))
            .map((w: Json) => ({ id: w.id, account: txt(w.account, 80), holder: txt(w.holder, 80) || null, qr: null })),
        };
      }
      if ("loyalty" in inp) {
        const l = (inp.loyalty ?? {}) as Json;
        next.loyalty = { enabled: Boolean(l.enabled), per: Number(l.per) || 1, block: Math.floor(Number(l.block)) || 100, reward: Number(l.reward) || 1 };
      }
      const { error } = await db().from("stores").update({ shipping: next }).eq("id", s.id);
      if (error) fail(error.message);
      refreshStore(s);
      return { ok: true, settings: next };
    },
  },
  {
    name: "set_exchange_rate",
    description: "For stores priced in USD: today's rate in new Syrian pounds per dollar, so customers see pounds. rate=null turns it off. round: 1,5,10,50,100,500 (prices round up). show: 'syp' or 'both'.",
    write: true,
    inputSchema: { type: "object", properties: { ...STORE, rate: { type: ["number", "null"] }, round: { type: "integer" }, show: { type: "string", enum: ["syp", "both"] } }, required: ["store", "rate"] },
    async run(a) {
      const s = await storeOf(a);
      if (s.currency !== "USD") fail("This store prices in SYP; an exchange rate is only for USD stores.");
      const old = s.shipping?.fx;
      const rate = num(a.rate);
      const fx =
        rate === null
          ? null
          : rate > 0 && rate < 1_000_000
            ? { rate: Math.round(rate * 100) / 100, round: FX_ROUND_STEPS.includes(Number(a.round ?? old?.round ?? 5)) ? Number(a.round ?? old?.round ?? 5) : 1, show: (a.show ?? old?.show) === "both" ? "both" : "syp", updated_at: new Date().toISOString() }
            : fail("Rate must be a positive number.");
      await db().from("stores").update({ shipping: { ...(s.shipping ?? {}), fx } }).eq("id", s.id);
      refreshStore(s);
      return { ok: true, fx };
    },
  },
  {
    name: "get_sections",
    description: "The store's home page sections in order (hero, announcement, categories, featured_products, collection_products, image_text, image_banner, features, testimonials, faq, rich_text, whatsapp_cta). Read before update_sections.",
    inputSchema: { type: "object", properties: { ...STORE }, required: ["store"] },
    async run(a) {
      const s = await storeOf(a);
      return s.sections;
    },
  },
  {
    name: "update_sections",
    description: "Replace the home page sections with this full list (same shapes as get_sections returns; max 15; images must be paths from import_image for this store). Get the current list first and edit it.",
    write: true,
    inputSchema: { type: "object", properties: { ...STORE, sections: { type: "array", items: { type: "object" } } }, required: ["store", "sections"] },
    async run(a) {
      const s = await storeOf(a);
      const sections = cleanSections(a.sections, s.id);
      if (!sections.length) fail("No valid sections. Check the shapes against get_sections.");
      await db().from("stores").update({ sections }).eq("id", s.id);
      refreshStore(s);
      return { ok: true, saved: sections.length, dropped: Array.isArray(a.sections) ? a.sections.length - sections.length : 0 };
    },
  },
  {
    name: "set_plan",
    description: "Admin: change a store's plan (trial, basic, pro) and/or its paid-until date (YYYY-MM-DD). Does not record a payment; use the admin panel for payments.",
    write: true,
    inputSchema: { type: "object", properties: { ...STORE, plan: { type: "string", enum: ["trial", "basic", "pro"] }, paid_until: { type: ["string", "null"] } }, required: ["store"] },
    async run(a) {
      const s = await storeOf(a);
      const patch: Json = {};
      if ("plan" in a) patch.plan = ["trial", "basic", "pro"].includes(String(a.plan)) ? a.plan : fail("Unknown plan.");
      if ("paid_until" in a) patch.paid_until = a.paid_until === null ? null : /^\d{4}-\d{2}-\d{2}$/.test(String(a.paid_until)) ? a.paid_until : fail("paid_until must be YYYY-MM-DD.");
      if (!Object.keys(patch).length) fail("Pass plan and/or paid_until.");
      await db().from("stores").update(patch).eq("id", s.id);
      revalidatePath("/admin", "layout");
      return { ok: true, ...patch };
    },
  },

  // ───────────── Products ─────────────
  {
    name: "list_products",
    description: "List a store's products (id, title, price, old price, stock, active, category, sku, variant count, main image). Filters: query (title), category, collection_id, active. Use offset to page.",
    inputSchema: { type: "object", properties: { ...STORE, query: { type: "string" }, category: { type: "string" }, collection_id: { type: "string" }, active: { type: "boolean" }, limit: { type: "integer", default: 50 }, offset: { type: "integer", default: 0 } }, required: ["store"] },
    async run(a) {
      const s = await storeOf(a);
      const limit = int(a.limit, 50, 200);
      const offset = Math.max(0, Math.floor(Number(a.offset ?? 0)) || 0);
      let q = db().from("products").select("*", { count: "exact" }).eq("store_id", s.id).order("created_at", { ascending: false }).range(offset, offset + limit - 1);
      if (a.query) q = q.ilike("title", `%${String(a.query).replace(/[%]/g, "")}%`);
      if (a.category) q = q.eq("category", String(a.category));
      if (a.collection_id && UUID.test(String(a.collection_id))) q = q.contains("collection_ids", [String(a.collection_id)]);
      if (typeof a.active === "boolean") q = q.eq("active", a.active);
      const { data, count } = await q;
      return { total: count ?? 0, offset, products: ((data ?? []) as Product[]).map(productSummary) };
    },
  },
  {
    name: "get_product",
    description: "One product in full: description, images, options, variants, specs, collections, quantity offers.",
    inputSchema: { type: "object", properties: { ...STORE, id: { type: "string" } }, required: ["store", "id"] },
    async run(a) {
      const s = await storeOf(a);
      const p = await productOf(s, a.id);
      return { ...p, url: `${storeUrl(s.slug)}/p/${p.id}` };
    },
  },
  {
    name: "create_product",
    description: "Add a product. Needs title and price (or variants). Upload pictures first with import_image and pass their paths in images. Plan limits apply (basic: 100 products).",
    write: true,
    inputSchema: { type: "object", properties: { ...STORE, ...PRODUCT_FIELDS }, required: ["store", "title"] },
    async run(a) {
      const s = await storeOf(a);
      const limit = limits(s).products;
      const { count } = await db().from("products").select("id", { count: "exact", head: true }).eq("store_id", s.id);
      if ((count ?? 0) >= limit) fail(`This store reached its product limit (${limit}) for the ${s.plan} plan.`);
      const row = await productRow(s, a);
      const { data, error } = await db().from("products").insert(row).select("id").single();
      if (error || !data) fail(error?.message ?? "Not saved.");
      const warn = await saveOffersFor(s, data!.id as string, a.qty_prices);
      refreshStore(s);
      return { ok: true, id: data!.id, url: `${storeUrl(s.slug)}/p/${data!.id}`, ...(warn ? { warning: warn } : {}) };
    },
  },
  {
    name: "update_product",
    description: "Change a product. Only the fields you pass change (others keep their value). To change variant prices, pass the full options and variants.",
    write: true,
    inputSchema: { type: "object", properties: { ...STORE, id: { type: "string" }, ...PRODUCT_FIELDS }, required: ["store", "id"] },
    async run(a) {
      const s = await storeOf(a);
      const old = await productOf(s, a.id);
      const row = await productRow(s, a, old);
      const { error } = await db().from("products").update(row).eq("id", old.id).eq("store_id", s.id);
      if (error) fail(error.message);
      const warn = await saveOffersFor(s, old.id, a.qty_prices);
      refreshStore(s);
      return { ok: true, id: old.id, ...(warn ? { warning: warn } : {}) };
    },
  },
  {
    name: "delete_product",
    description: "Remove a product. By default it is hidden (active=false) and can be restored. permanent=true deletes it for good (its images stay in storage; past orders keep their copy).",
    write: true,
    inputSchema: { type: "object", properties: { ...STORE, id: { type: "string" }, permanent: { type: "boolean", default: false } }, required: ["store", "id"] },
    async run(a) {
      const s = await storeOf(a);
      const p = await productOf(s, a.id);
      if (a.permanent === true) await db().from("products").delete().eq("id", p.id).eq("store_id", s.id);
      else await db().from("products").update({ active: false }).eq("id", p.id).eq("store_id", s.id);
      refreshStore(s);
      return { ok: true, id: p.id, title: p.title, result: a.permanent === true ? "deleted" : "hidden" };
    },
  },
  {
    name: "bulk_update_prices",
    description:
      "Change many prices at once. Choose products by ids, category, collection_id, or all=true. mode: percent (e.g. -10 lowers 10%, 15 raises 15%), add (adds an amount), set (sets one price). round_to rounds results (e.g. 0.5, 1, 500). Variant prices change too. dry_run defaults to TRUE: it only shows old and new prices. Run again with dry_run=false to apply.",
    write: true,
    inputSchema: {
      type: "object",
      properties: {
        ...STORE,
        ids: { type: "array", items: { type: "string" } },
        category: { type: "string" },
        collection_id: { type: "string" },
        all: { type: "boolean" },
        mode: { type: "string", enum: ["percent", "add", "set"] },
        value: { type: "number" },
        round_to: { type: "number" },
        dry_run: { type: "boolean", default: true },
      },
      required: ["store", "mode", "value"],
    },
    async run(a) {
      const s = await storeOf(a);
      const value = Number(a.value);
      if (!Number.isFinite(value)) fail("'value' must be a number.");
      const mode = String(a.mode);
      if (!["percent", "add", "set"].includes(mode)) fail("mode must be percent, add or set.");
      let q = db().from("products").select("*").eq("store_id", s.id).limit(3000);
      if (Array.isArray(a.ids) && a.ids.length) q = q.in("id", (a.ids as unknown[]).map(String).filter((x) => UUID.test(x)));
      else if (a.category) q = q.eq("category", String(a.category));
      else if (a.collection_id && UUID.test(String(a.collection_id))) q = q.contains("collection_ids", [String(a.collection_id)]);
      else if (a.all !== true) fail("Choose products: ids, category, collection_id, or all=true.");
      const { data } = await q;
      const step = Number(a.round_to) > 0 ? Number(a.round_to) : 0.01;
      const r = (n: number) => Math.max(0, Math.round(Math.round(n / step) * step * 100) / 100);
      const f = (p: number) => r(mode === "percent" ? p * (1 + value / 100) : mode === "add" ? p + value : value);
      const changes = ((data ?? []) as Product[]).map((p) => {
        const variants = (p.variants ?? []).map((v) => ({ ...v, price: f(Number(v.price)), compare_at_price: v.compare_at_price && mode === "percent" ? r(Number(v.compare_at_price) * (1 + value / 100)) : v.compare_at_price ?? null }));
        const price = variants.length ? Math.min(...variants.map((v) => v.price)) : f(Number(p.price));
        let compare = p.compare_at_price == null ? null : mode === "percent" ? r(Number(p.compare_at_price) * (1 + value / 100)) : Number(p.compare_at_price);
        if (compare !== null && compare <= price) compare = null;
        return { p, price, compare, variants };
      });
      const preview = changes.slice(0, 200).map((c) => ({ id: c.p.id, title: c.p.title, old_price: Number(c.p.price), new_price: c.price, new_compare_at_price: c.compare }));
      if (a.dry_run !== false) return { dry_run: true, products: changes.length, preview, note: "Nothing changed. Run again with dry_run=false to apply." };
      for (const c of changes) await db().from("products").update({ price: c.price, compare_at_price: c.variants.length ? null : c.compare, variants: c.variants }).eq("id", c.p.id).eq("store_id", s.id);
      refreshStore(s);
      return { ok: true, updated: changes.length, preview };
    },
  },
  {
    name: "set_stock",
    description: "Set the stock of a product, or of one variant (variant_id). stock=null means not tracked (unlimited).",
    write: true,
    inputSchema: { type: "object", properties: { ...STORE, id: { type: "string" }, variant_id: { type: "string" }, stock: { type: ["integer", "null"] } }, required: ["store", "id", "stock"] },
    async run(a) {
      const s = await storeOf(a);
      const p = await productOf(s, a.id);
      const stock = a.stock === null ? null : Math.max(0, Math.floor(Number(a.stock)));
      if (stock !== null && !Number.isFinite(stock)) fail("stock must be a whole number or null.");
      if (a.variant_id) {
        const vs = p.variants ?? [];
        if (!vs.some((v) => v.id === a.variant_id)) fail("Variant not found; see get_product.");
        await db().from("products").update({ variants: vs.map((v) => (v.id === a.variant_id ? { ...v, stock } : v)) }).eq("id", p.id);
      } else {
        if ((p.variants ?? []).length) fail("This product has variants: pass variant_id.");
        await db().from("products").update({ stock }).eq("id", p.id);
      }
      refreshStore(s);
      return { ok: true, id: p.id, stock };
    },
  },
  {
    name: "import_image",
    description: "Download a picture from a public https URL into the store's storage (resized, WebP) and return its path for product images, logo, sections or collections.",
    write: true,
    inputSchema: { type: "object", properties: { ...STORE, url: { type: "string" } }, required: ["store", "url"] },
    async run(a) {
      const s = await storeOf(a);
      const url = String(a.url ?? "");
      if (!/^https:\/\//.test(url)) fail("Use a public https:// link to the image.");
      const host = new URL(url).hostname;
      if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(host) || host.endsWith(".internal")) fail("That address is not allowed.");
      const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(15000) }).catch(() => null);
      if (!res || !res.ok) fail(`Could not download the image (${res?.status ?? "no response"}).`);
      const type = res!.headers.get("content-type") ?? "";
      if (!/^image\//.test(type)) fail(`That link is not an image (${type || "unknown type"}).`);
      const buf = Buffer.from(await res!.arrayBuffer());
      if (buf.length > 12 * 1024 * 1024) fail("The image is larger than 12 MB.");
      const path = await saveImageBuffer(s.id, buf).catch(() => fail("Could not read that image."));
      return { ok: true, path };
    },
  },

  // ───────────── Collections ─────────────
  {
    name: "list_collections",
    description: "A store's collections (id, title, handle, image, number of products).",
    inputSchema: { type: "object", properties: { ...STORE }, required: ["store"] },
    async run(a) {
      const s = await storeOf(a);
      const { data } = await db().from("collections").select("id, title, handle, description, image").eq("store_id", s.id).order("created_at");
      const { data: prods } = await db().from("products").select("collection_ids").eq("store_id", s.id);
      return (data ?? []).map((c) => ({ ...c, products: (prods ?? []).filter((p) => ((p.collection_ids as string[]) ?? []).includes(c.id as string)).length }));
    },
  },
  {
    name: "save_collection",
    description: "Create a collection, or change one (pass id). handle is the link name (a-z, 0-9, -).",
    write: true,
    inputSchema: { type: "object", properties: { ...STORE, id: { type: "string" }, title: { type: "string" }, handle: { type: "string" }, description: { type: "string" }, image: { type: ["string", "null"] } }, required: ["store", "title"] },
    async run(a) {
      const s = await storeOf(a);
      const title = txt(a.title, 80) || fail("A collection needs a title.");
      const handle = String(a.handle ?? "").toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || `c-${Date.now().toString(36)}`;
      const image = a.image && String(a.image).startsWith(`/api/media/${s.id}/`) ? String(a.image) : null;
      const row = { store_id: s.id, title, handle, description: txt(a.description, 1000) || null, image };
      const res = a.id
        ? await db().from("collections").update(row).eq("id", String(a.id)).eq("store_id", s.id).select("id").maybeSingle()
        : await db().from("collections").insert(row).select("id").single();
      if (res.error) fail(res.error.message.includes("duplicate") ? "That handle is already used in this store." : res.error.message);
      refreshStore(s);
      return { ok: true, id: res.data?.id, url: `${storeUrl(s.slug)}/collections/${handle}` };
    },
  },
  {
    name: "set_collection_products",
    description: "Put products in a collection: mode add (default), remove, or replace (the collection gets exactly these products).",
    write: true,
    inputSchema: { type: "object", properties: { ...STORE, collection_id: { type: "string" }, product_ids: { type: "array", items: { type: "string" } }, mode: { type: "string", enum: ["add", "remove", "replace"] } }, required: ["store", "collection_id", "product_ids"] },
    async run(a) {
      const s = await storeOf(a);
      const cid = String(a.collection_id ?? "");
      const { data: col } = await db().from("collections").select("id").eq("id", cid).eq("store_id", s.id).maybeSingle();
      if (!col) fail("Collection not found in this store.");
      const ids = new Set((Array.isArray(a.product_ids) ? a.product_ids : []).map(String));
      const mode = String(a.mode ?? "add");
      const { data } = await db().from("products").select("id, collection_ids").eq("store_id", s.id);
      let changed = 0;
      for (const p of data ?? []) {
        const has = ((p.collection_ids as string[]) ?? []).includes(cid);
        const want = mode === "replace" ? ids.has(p.id as string) : mode === "remove" ? (ids.has(p.id as string) ? false : has) : ids.has(p.id as string) || has;
        if (want === has) continue;
        const next = want ? [...((p.collection_ids as string[]) ?? []), cid] : ((p.collection_ids as string[]) ?? []).filter((x) => x !== cid);
        await db().from("products").update({ collection_ids: next }).eq("id", p.id);
        changed++;
      }
      refreshStore(s);
      return { ok: true, changed };
    },
  },

  // ───────────── Orders & customers ─────────────
  {
    name: "list_orders",
    description: "A store's orders, newest first (number, date, customer, phone, total, status, payment, pickup/delivery, in-shop sale, WhatsApp sent). Filters: status (new, confirmed, shipped, delivered, cancelled), since_days.",
    inputSchema: { type: "object", properties: { ...STORE, status: { type: "string" }, since_days: { type: "integer" }, limit: { type: "integer", default: 30 } }, required: ["store"] },
    async run(a) {
      const s = await storeOf(a);
      let q = db().from("orders").select("*").eq("store_id", s.id).order("created_at", { ascending: false }).limit(int(a.limit, 30, 200));
      if (a.status) q = q.eq("status", String(a.status));
      if (a.since_days) q = q.gte("created_at", new Date(Date.now() - Number(a.since_days) * 864e5).toISOString());
      const { data } = await q;
      return ((data ?? []) as Order[]).map((o) => ({
        id: o.id,
        number: o.number,
        created_at: o.created_at,
        customer: o.customer_name,
        phone: o.phone,
        total: Number(o.total),
        status: o.status,
        payment_status: o.payment_status,
        fulfillment: o.fulfillment,
        in_store: o.in_store ?? false,
        whatsapp: o.wa_status ?? null,
        items: o.items.length,
      }));
    },
  },
  {
    name: "get_order",
    description: "One order in full, by number (e.g. 1043) or id: items, prices, customer, address, notes, payment, gift, history.",
    inputSchema: { type: "object", properties: { ...STORE, number: { type: "integer" }, id: { type: "string" } }, required: ["store"] },
    async run(a) {
      const s = await storeOf(a);
      let q = db().from("orders").select("*").eq("store_id", s.id);
      q = a.id ? q.eq("id", String(a.id)) : a.number ? q.eq("number", Number(a.number)) : fail("Pass number or id.");
      const { data } = await q.maybeSingle();
      if (!data) fail("Order not found.");
      const { data: events } = await db().from("order_events").select("message, created_at").eq("order_id", data!.id).order("created_at");
      return { ...data, events: events ?? [] };
    },
  },
  {
    name: "update_order",
    description: "Change an order: status (new, confirmed, shipped, delivered), paid (true/false), or cancel=true (restock=true puts the quantities back). Delivered orders earn loyalty points when the store uses them.",
    write: true,
    inputSchema: { type: "object", properties: { ...STORE, number: { type: "integer" }, id: { type: "string" }, status: { type: "string", enum: ["new", "confirmed", "shipped", "delivered"] }, paid: { type: "boolean" }, cancel: { type: "boolean" }, restock: { type: "boolean", default: true } }, required: ["store"] },
    async run(a) {
      const s = await storeOf(a);
      let q = db().from("orders").select("*").eq("store_id", s.id);
      q = a.id ? q.eq("id", String(a.id)) : a.number ? q.eq("number", Number(a.number)) : fail("Pass number or id.");
      const { data } = await q.maybeSingle();
      if (!data) fail("Order not found.");
      const o = data as Order;
      const done: string[] = [];
      const event = (message: string) => db().from("order_events").insert({ order_id: o.id, store_id: s.id, message });
      if (a.cancel === true) {
        if (o.status === "cancelled") fail("Already cancelled.");
        const { error } = await db().rpc("cancel_order", { p_order: o.id, p_store: s.id, p_restock: a.restock !== false });
        if (error) fail(error.message);
        done.push("cancelled");
      } else if (a.status) {
        if (o.status === "cancelled") fail("A cancelled order cannot change status.");
        const st = String(a.status);
        if (!["new", "confirmed", "shipped", "delivered"].includes(st)) fail("Unknown status.");
        await db().from("orders").update({ status: st }).eq("id", o.id);
        await event(`تغيرت الحالة إلى: ${st} (عبر Claude)`);
        if (st === "delivered") await awardPoints(s, o);
        done.push(`status ${st}`);
      }
      if (typeof a.paid === "boolean") {
        await db().from("orders").update({ payment_status: a.paid ? "paid" : "pending" }).eq("id", o.id);
        await event(a.paid ? "تم استلام المبلغ (عبر Claude)" : "أُعيد الطلب إلى غير مدفوع (عبر Claude)");
        done.push(a.paid ? "paid" : "unpaid");
      }
      if (!done.length) fail("Nothing to change: pass status, paid or cancel.");
      revalidatePath(`/dashboard/orders/${o.id}`);
      return { ok: true, number: o.number, done };
    },
  },
  {
    name: "list_customers",
    description: "A store's customers (name, phone, city, orders, total spent, last order). Optional search by name or phone.",
    inputSchema: { type: "object", properties: { ...STORE, query: { type: "string" }, limit: { type: "integer", default: 50 } }, required: ["store"] },
    async run(a) {
      const s = await storeOf(a);
      let q = db().from("customers").select("id, name, phone, city, orders_count, total_spent, last_order_at").eq("store_id", s.id).order("last_order_at", { ascending: false }).limit(int(a.limit, 50, 500));
      const query = String(a.query ?? "").replace(/[%,()]/g, "").trim();
      if (query) q = q.or(`name.ilike.%${query}%,phone.ilike.%${query}%`);
      const { data } = await q;
      return data ?? [];
    },
  },

  // ───────────── Discounts ─────────────
  {
    name: "list_discounts",
    description: "A store's discounts and codes (code or automatic, kind, value, minimum, limit, used, dates, active).",
    inputSchema: { type: "object", properties: { ...STORE }, required: ["store"] },
    async run(a) {
      const s = await storeOf(a);
      const { data } = await db().from("discounts").select("*").eq("store_id", s.id).order("created_at", { ascending: false });
      return data ?? [];
    },
  },
  {
    name: "create_discount",
    description: "Create a discount. With code: customers type it (A-Z, 0-9, _ -). automatic=true: applies by itself (needs title). kind: percent | fixed | free_shipping. Optional min_subtotal, usage_limit, starts_at, ends_at (ISO dates).",
    write: true,
    inputSchema: {
      type: "object",
      properties: { ...STORE, code: { type: "string" }, automatic: { type: "boolean" }, title: { type: "string" }, kind: { type: "string", enum: ["percent", "fixed", "free_shipping"] }, value: { type: "number" }, min_subtotal: { type: "number" }, usage_limit: { type: "integer" }, starts_at: { type: "string" }, ends_at: { type: "string" } },
      required: ["store", "kind"],
    },
    async run(a) {
      const s = await storeOf(a);
      const automatic = a.automatic === true;
      const kind = String(a.kind);
      const code = String(a.code ?? "").toUpperCase().trim();
      if (!["percent", "fixed", "free_shipping"].includes(kind)) fail("kind must be percent, fixed or free_shipping.");
      if (!automatic && !/^[A-Z0-9_-]{3,30}$/.test(code)) fail("A code must be 3 to 30 characters: A-Z, 0-9, _ or -.");
      const value = kind === "free_shipping" ? 0 : Number(a.value);
      if (kind !== "free_shipping" && !(value > 0)) fail("Give a value above 0.");
      if (kind === "percent" && value > 100) fail("A percent cannot exceed 100.");
      const date = (v: unknown) => (v ? (Number.isNaN(Date.parse(String(v))) ? fail("Dates must be ISO, e.g. 2026-12-31.") : new Date(String(v)).toISOString()) : null);
      const { data, error } = await db()
        .from("discounts")
        .insert({ store_id: s.id, code: automatic ? null : code, title: txt(a.title, 80) || code, kind, value, min_subtotal: num(a.min_subtotal), usage_limit: num(a.usage_limit), automatic, starts_at: date(a.starts_at), ends_at: date(a.ends_at), active: true })
        .select("id")
        .single();
      if (error) fail(error.message.includes("duplicate") ? "That code already exists in this store." : error.message);
      return { ok: true, id: data!.id, code: automatic ? null : code };
    },
  },
  {
    name: "set_discount_active",
    description: "Turn a discount on or off.",
    write: true,
    inputSchema: { type: "object", properties: { ...STORE, id: { type: "string" }, active: { type: "boolean" } }, required: ["store", "id", "active"] },
    async run(a) {
      const s = await storeOf(a);
      const { data } = await db().from("discounts").update({ active: Boolean(a.active) }).eq("id", String(a.id)).eq("store_id", s.id).select("id").maybeSingle();
      if (!data) fail("Discount not found in this store.");
      return { ok: true };
    },
  },

  // ───────────── Pages & stats ─────────────
  {
    name: "list_pages",
    description: "A store's pages (about, delivery and payment, returns policy...): title, handle, published, body.",
    inputSchema: { type: "object", properties: { ...STORE }, required: ["store"] },
    async run(a) {
      const s = await storeOf(a);
      const { data } = await db().from("pages").select("id, title, handle, body, published").eq("store_id", s.id).order("created_at");
      return data ?? [];
    },
  },
  {
    name: "save_page",
    description: "Create or update a page by handle (a-z, 0-9, -). Shown at /pages/<handle>. Body is plain text; blank lines separate paragraphs.",
    write: true,
    inputSchema: { type: "object", properties: { ...STORE, handle: { type: "string" }, title: { type: "string" }, body: { type: "string" }, published: { type: "boolean", default: true } }, required: ["store", "handle", "title", "body"] },
    async run(a) {
      const s = await storeOf(a);
      const handle = String(a.handle ?? "").toLowerCase();
      if (!/^[a-z0-9-]{1,60}$/.test(handle)) fail("handle must be a-z, 0-9 and -.");
      const row = { store_id: s.id, handle, title: txt(a.title, 100) || fail("Title needed."), body: txt(a.body, 20000), published: a.published !== false };
      const { error } = await db().from("pages").upsert(row, { onConflict: "store_id,handle" });
      if (error) fail(error.message);
      refreshStore(s);
      return { ok: true, url: `${storeUrl(s.slug)}/pages/${handle}` };
    },
  },
  {
    name: "store_stats",
    description: "Sales numbers for a store over the last N days (default 30): orders, revenue (after refunds, without cancelled), average order, online vs in-shop, top products, and orders still waiting.",
    inputSchema: { type: "object", properties: { ...STORE, days: { type: "integer", default: 30 } }, required: ["store"] },
    async run(a) {
      const s = await storeOf(a);
      const days = int(a.days, 30, 365);
      const { data } = await db().from("orders").select("*").eq("store_id", s.id).gte("created_at", new Date(Date.now() - days * 864e5).toISOString()).limit(5000);
      const orders = ((data ?? []) as Order[]).filter((o) => o.status !== "cancelled");
      const revenue = orders.reduce((t, o) => t + Number(o.total) - Number(o.refunded ?? 0), 0);
      const top = new Map<string, { title: string; qty: number; revenue: number }>();
      for (const o of orders)
        for (const i of o.items) {
          const k = i.productId;
          const cur = top.get(k) ?? { title: i.title, qty: 0, revenue: 0 };
          cur.qty += i.qty;
          cur.revenue += i.price * i.qty;
          top.set(k, cur);
        }
      return {
        days,
        currency: s.currency,
        exchange_rate: liveFx(s)?.rate ?? null,
        orders: orders.length,
        revenue: Math.round(revenue * 100) / 100,
        average_order: orders.length ? Math.round((revenue / orders.length) * 100) / 100 : 0,
        in_shop: orders.filter((o) => o.in_store).length,
        online: orders.filter((o) => !o.in_store).length,
        waiting: orders.filter((o) => o.status === "new").length,
        top_products: [...top.values()].sort((x, y) => y.qty - x.qty).slice(0, 10),
        from: day(new Date(Date.now() - days * 864e5)),
      };
    },
  },
  {
    name: "recent_actions",
    description: "The last actions made through this connector (tool, store, time, success or error). Useful to review or undo.",
    inputSchema: { type: "object", properties: { limit: { type: "integer", default: 30 } } },
    async run(a) {
      const { data } = await db().from("mcp_log").select("tool, store_id, input, ok, error, created_at").order("created_at", { ascending: false }).limit(int(a.limit, 30, 200));
      return data ?? [];
    },
  },
];
