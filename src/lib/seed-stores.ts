import "server-only";
import { randomInt, randomUUID } from "node:crypto";
import { demoCollections, demoProducts, demoStores } from "./demo-data";
import { saveImageBuffer } from "./media";
import { createTemplatePages } from "./store-setup";
import { templateMenus, templatePages } from "./business-templates";
import { supabaseAdmin } from "./supabase";
import type { Product, Section } from "./types";

/**
 * Three complete sample stores in the real database (products, stock, customers,
 * orders in every status, discount codes, visits), so the whole platform can be tested.
 */
type Pack = {
  slug: string;
  from: string; // demo store id to copy
  name: string;
  sub: "trial" | "paid" | "expiring";
  stock: Record<string, number>;
  discounts: { code: string | null; title: string; kind: "percent" | "fixed" | "free_shipping"; value: number; min?: number; automatic?: boolean; expired?: boolean; limit?: number }[];
  shipping: { default_fee: number; free_over?: number; rates: { city: string; fee: number }[] };
  orders: { c: number; items: [string, number, string?][]; code?: string; status: string; daysAgo: number; manual?: boolean }[];
};

export const SEED_SLUGS = ["matbakh-test", "lamar-test", "yasmine-test"];

const CUSTOMERS = [
  { name: "أم محمد", phone: "0933111222", city: "حمص", address: "الإنشاءات، جانب جامع الصحابة" },
  { name: "رنا الحسن", phone: "0944222333", city: "دمشق", address: "المزة فيلات، بناء 12" },
  { name: "أبو سامر", phone: "0955333444", city: "حماة", address: "حي الشريعة، الشارع الرئيسي" },
  { name: "لين خليل", phone: "0966444555", city: "حلب", address: "الفرقان، قرب دوار الكرة الأرضية" },
  { name: "محمد العلي", phone: "0988555666", city: "اللاذقية", address: "الزراعة، بناء الأطباء" },
  { name: "سارة يوسف", phone: "0991666777", city: "دمشق", address: "باب توما، حارة الجوزة" },
  { name: "خالد درويش", phone: "0932777888", city: "طرطوس", address: "الكورنيش البحري" },
];

const PACKS: Pack[] = [
  {
    slug: "matbakh-test",
    from: "s-kitchen",
    name: "بيت المطبخ",
    sub: "paid",
    stock: { k1: 12, k2: 25, k3: 40, k4: 6, k5: 15, k6: 3, k7: 4, k8: 0 },
    shipping: { default_fee: 3, free_over: 60, rates: [{ city: "حمص", fee: 0 }, { city: "حماة", fee: 2 }, { city: "دمشق", fee: 3 }] },
    discounts: [
      { code: "WELCOME10", title: "خصم 10% لأول طلب", kind: "percent", value: 10 },
      { code: "FREESHIP", title: "توصيل مجاني فوق 30$", kind: "free_shipping", value: 0, min: 30 },
      { code: null, title: "خصم 5$ على الطلبات فوق 80$", kind: "fixed", value: 5, min: 80, automatic: true },
      { code: "OLD20", title: "كود منتهي (للتجربة)", kind: "percent", value: 20, expired: true },
    ],
    orders: [
      { c: 0, items: [["k1", 1], ["k3", 2]], status: "delivered", daysAgo: 13 },
      { c: 1, items: [["k7", 1]], code: "WELCOME10", status: "delivered", daysAgo: 11 },
      { c: 2, items: [["k4", 1], ["k5", 1]], status: "delivered", daysAgo: 9 },
      { c: 0, items: [["k6", 2]], status: "delivered", daysAgo: 7 },
      { c: 3, items: [["k2", 2], ["k3", 1]], code: "FREESHIP", status: "shipped", daysAgo: 4 },
      { c: 4, items: [["k1", 2], ["k7", 1]], status: "confirmed", daysAgo: 2, manual: true },
      { c: 5, items: [["k5", 1]], status: "cancelled", daysAgo: 3 },
      { c: 6, items: [["k4", 1]], status: "new", daysAgo: 0 },
      { c: 1, items: [["k2", 2], ["k6", 1]], status: "new", daysAgo: 0 },
    ],
  },
  {
    slug: "lamar-test",
    from: "s-fashion",
    name: "لمار",
    sub: "trial",
    stock: { f2: 10, f3: 30, f4: 14, f5: 50, f6: 2 },
    shipping: { default_fee: 2.5, free_over: 75, rates: [{ city: "دمشق", fee: 1 }, { city: "ريف دمشق", fee: 2 }] },
    discounts: [
      { code: "LAMAR15", title: "خصم 15% على كل شي", kind: "percent", value: 15, limit: 50 },
      { code: "SHAL3", title: "3$ خصم فوق 40$", kind: "fixed", value: 3, min: 40 },
      { code: null, title: "توصيل مجاني فوق 60$", kind: "free_shipping", value: 0, min: 60, automatic: true },
    ],
    orders: [
      { c: 1, items: [["f1", 1, "M / أسود"], ["f5", 1]], status: "delivered", daysAgo: 12 },
      { c: 5, items: [["f2", 1]], code: "LAMAR15", status: "delivered", daysAgo: 8 },
      { c: 3, items: [["f6", 1], ["f3", 2]], status: "shipped", daysAgo: 3 },
      { c: 1, items: [["f4", 1], ["f3", 2]], code: "SHAL3", status: "confirmed", daysAgo: 1 },
      { c: 4, items: [["f1", 1, "L / خمري"]], status: "cancelled", daysAgo: 5 },
      { c: 6, items: [["f5", 3]], status: "new", daysAgo: 0 },
    ],
  },
  {
    slug: "yasmine-test",
    from: "s-sweets",
    name: "حلويات الياسمين",
    sub: "expiring",
    stock: { h1: 20, h2: 15, h3: 25, h4: 5, h5: 8, h6: 10 },
    shipping: { default_fee: 15000, free_over: 500000, rates: [{ city: "دمشق", fee: 10000 }, { city: "ريف دمشق", fee: 20000 }] },
    discounts: [
      { code: "EID", title: "عرض العيد 10%", kind: "percent", value: 10 },
      { code: "BOX50", title: "50 ألف خصم فوق 400 ألف", kind: "fixed", value: 50000, min: 400000 },
    ],
    orders: [
      { c: 5, items: [["h2", 1], ["h1", 1]], status: "delivered", daysAgo: 10 },
      { c: 1, items: [["h5", 2]], code: "EID", status: "delivered", daysAgo: 6 },
      { c: 5, items: [["h4", 1], ["h6", 1]], code: "BOX50", status: "shipped", daysAgo: 2 },
      { c: 0, items: [["h3", 2]], status: "confirmed", daysAgo: 1, manual: true },
      { c: 2, items: [["h1", 1]], status: "new", daysAgo: 0 },
    ],
  },
];

const day = (n: number) => new Date(Date.now() - n * 86400000);
const ymd = (d: Date) => d.toISOString().slice(0, 10);

function makePassword() {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: 10 }, () => chars[randomInt(chars.length)]).join("");
}

/** a@b.com -> a+slug@b.com, so all test logins land in the platform owner's inbox. */
const plusEmail = (email: string, tag: string) => {
  const [u, d] = email.split("@");
  return `${u.split("+")[0]}+${tag}@${d}`;
};

export type SeedResult = { name: string; slug: string; email: string; password: string; orders: number; error?: string };

export async function seedStores(adminEmail: string, origin: string, whatsapp: string): Promise<SeedResult[]> {
  const db = supabaseAdmin();
  const results: SeedResult[] = [];
  for (const pack of PACKS) {
    const email = plusEmail(adminEmail, pack.slug.replace("-test", ""));
    const password = makePassword();
    const base = { name: pack.name, slug: pack.slug, email, password, orders: 0 };
    const { data: taken } = await db.from("stores").select("id").eq("slug", pack.slug).maybeSingle();
    if (taken) {
      results.push({ ...base, password: "", error: "موجود من قبل. احذف المتاجر التجريبية أول وبعدين أعد الإنشاء" });
      continue;
    }
    try {
      results.push({ ...base, orders: await seedOne(pack, email, password, origin, whatsapp) });
    } catch (e) {
      console.error("seed", pack.slug, e);
      results.push({ ...base, password: "", error: e instanceof Error ? e.message : "صار خطأ" });
    }
  }
  return results;
}

async function seedOne(pack: Pack, email: string, password: string, origin: string, whatsapp: string): Promise<number> {
  const db = supabaseAdmin();
  const demo = demoStores.find((s) => s.id === pack.from)!;

  const { data: u, error: ue } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (ue || !u.user) throw new Error(/already|registered|exists/i.test(ue?.message ?? "") ? `في حساب بالإيميل ${email}` : "ما قدرنا ننشئ الحساب");

  const paidUntil = pack.sub === "trial" ? ymd(new Date(Date.now() + 14 * 86400000)) : pack.sub === "paid" ? ymd(new Date(Date.now() + 90 * 86400000)) : ymd(new Date(Date.now() + 2 * 86400000));
  const { data: store, error: se } = await db
    .from("stores")
    .insert({
      owner_id: u.user.id,
      slug: pack.slug,
      name: pack.name,
      tagline: demo.tagline,
      whatsapp,
      city: demo.city,
      currency: demo.currency,
      theme: demo.theme,
      primary_color: demo.primary_color,
      delivery_note: demo.delivery_note,
      business_type: demo.business_type,
      social: demo.social ?? {},
      shipping: pack.shipping,
      sections: [],
      plan: pack.sub === "trial" ? "trial" : "basic",
      paid_until: paidUntil,
    })
    .select("id")
    .single();
  if (se || !store) {
    await db.auth.admin.deleteUser(u.user.id);
    throw new Error("ما قدرنا ننشئ المتجر");
  }
  const sid = store.id as string;

  // Images: copy the sample pictures into the store's own storage, like real uploads.
  const imgCache = new Map<string, string>();
  const img = async (path?: string) => {
    if (!path || !path.startsWith("/demo/")) return path;
    if (imgCache.has(path)) return imgCache.get(path)!;
    try {
      const res = await fetch(origin + path);
      if (!res.ok) throw new Error(String(res.status));
      const url = await saveImageBuffer(sid, Buffer.from(await res.arrayBuffer()));
      imgCache.set(path, url);
      return url;
    } catch {
      return path;
    }
  };

  // Collections
  const colMap = new Map<string, string>();
  for (const c of demoCollections.filter((x) => x.store_id === pack.from)) {
    const id = randomUUID();
    colMap.set(c.id, id);
    await db.from("collections").insert({ id, store_id: sid, title: c.title, handle: c.handle, description: c.description ?? null });
  }

  // Products with real stock
  const prodMap = new Map<string, Product & { newId: string }>();
  const demoList = demoProducts.filter((p) => p.store_id === pack.from);
  for (const [i, p] of demoList.entries()) {
    const newId = randomUUID();
    const images = await Promise.all((p.images ?? []).map((x) => img(x)));
    const variants = (p.variants ?? []).map((v, j) => ({ ...v, id: `v${j + 1}`, stock: v.stock === 0 ? 0 : 3 + ((i + j) % 6), sku: `${p.id.toUpperCase()}-${j + 1}` }));
    const row = {
      id: newId,
      store_id: sid,
      title: p.title,
      description: p.description,
      price: p.price,
      compare_at_price: p.compare_at_price ?? null,
      images,
      category: p.category,
      stock: variants.length ? null : (pack.stock[p.id] ?? null),
      active: true,
      sku: `${p.id.toUpperCase()}`,
      options: p.options ?? [],
      variants,
      collection_ids: (p.collection_ids ?? []).map((c) => colMap.get(c)).filter(Boolean),
      specs: p.specs ?? [],
      created_at: day(20 - i).toISOString(),
    };
    const { error } = await db.from("products").insert(row);
    if (error) throw new Error(`منتج ${p.title}: ${error.message}`);
    prodMap.set(p.id, { ...p, variants, newId });
  }

  // Home page sections with the copied pictures
  const sections: Section[] = [];
  for (const s of demo.sections) {
    const x = { ...s } as Section & { image?: string };
    if (x.image) x.image = await img(x.image);
    sections.push(x);
  }
  const cols = [...colMap.values()];
  if (cols.length) sections.splice(2, 0, { type: "collection_products", title: demoCollections.find((c) => c.store_id === pack.from)!.title, collectionId: cols[0], limit: 4 } as Section);

  // Pages and menus
  await createTemplatePages(sid, demo.business_type ?? "general", pack.name);
  const menus = templateMenus(templatePages(demo.business_type, pack.name));
  const firstCol = demoCollections.find((c) => c.store_id === pack.from);
  if (firstCol) menus.header = [...(menus.header ?? []), { label: firstCol.title, href: `/collections/${firstCol.handle}` }];
  await db
    .from("stores")
    .update({ sections, menus, seo: { title: `${pack.name} | ${demo.tagline}`, description: `${demo.tagline}. ${demo.delivery_note}` } })
    .eq("id", sid);

  // Discounts
  for (const d of pack.discounts) {
    await db.from("discounts").insert({
      store_id: sid,
      code: d.code,
      title: d.title,
      kind: d.kind,
      value: d.value,
      min_subtotal: d.min ?? null,
      automatic: d.automatic ?? false,
      usage_limit: d.limit ?? null,
      ends_at: d.expired ? day(5).toISOString() : null,
      starts_at: d.expired ? day(30).toISOString() : null,
    });
  }

  // Orders through the real checkout function (stock, customers, discounts all apply)
  let count = 0;
  for (const o of pack.orders) {
    const c = CUSTOMERS[o.c];
    const items = o.items.map(([pid, qty, vTitle]) => {
      const p = prodMap.get(pid)!;
      const v = vTitle ? p.variants?.find((x) => x.title === vTitle) : undefined;
      return { productId: p.newId, variantId: v?.id, qty };
    });
    const { data, error } = await db.rpc("place_order", {
      p_store: sid,
      p_customer: c,
      p_items: items,
      p_source: o.manual ? "manual" : "online",
      p_note: count === 2 ? "الرجاء الاتصال قبل التوصيل" : null,
      p_discount_code: o.code ?? null,
    });
    if (error || !data) throw new Error(`طلب: ${error?.message}`);
    const oid = (data as { id: string }).id;
    const at = new Date(day(o.daysAgo).getTime() - randomInt(1, 6) * 3600000);
    const events: { message: string; at: Date }[] = [];
    if (o.status === "cancelled") {
      await db.rpc("cancel_order", { p_order: oid, p_store: sid, p_restock: true });
    } else {
      const flow = ["confirmed", "shipped", "delivered"];
      const upto = flow.indexOf(o.status);
      const labels: Record<string, string> = { confirmed: "تم تأكيد الطلب مع الزبون", shipped: "انشحن الطلب مع شركة التوصيل", delivered: "انسلم الطلب وانقبض المبلغ" };
      flow.slice(0, upto + 1).forEach((s, k) => events.push({ message: labels[s], at: new Date(at.getTime() + (k + 1) * 5 * 3600000) }));
      await db
        .from("orders")
        .update({ status: o.status, payment_status: o.status === "delivered" ? "paid" : "pending" })
        .eq("id", oid);
    }
    await db.from("orders").update({ created_at: at.toISOString() }).eq("id", oid);
    await db.from("order_events").update({ created_at: at.toISOString() }).eq("order_id", oid);
    if (events.length) await db.from("order_events").insert(events.map((e) => ({ order_id: oid, store_id: sid, message: e.message, created_at: e.at.toISOString() })));
    count++;
  }

  // Customer dates follow their orders; one gets a note
  const { data: ords } = await db.from("orders").select("customer_id, created_at").eq("store_id", sid);
  const last = new Map<string, string>();
  for (const r of ords ?? []) if (!last.has(r.customer_id) || last.get(r.customer_id)! < r.created_at) last.set(r.customer_id, r.created_at);
  for (const [cid, at] of last) await db.from("customers").update({ last_order_at: at, created_at: at }).eq("id", cid);
  const firstCid = [...last.keys()][0];
  if (firstCid) await db.from("customers").update({ note: "زبونة دائمة، بتحب التوصيل المسائي" }).eq("id", firstCid);

  // Visits for the analytics page (last 21 days)
  const stats = Array.from({ length: 21 }, (_, i) => {
    const sessions = 25 + ((i * 37) % 40) + (i < 7 ? 20 : 0);
    return {
      store_id: sid,
      day: ymd(day(i)),
      sessions,
      page_views: sessions * 3 + (i % 5) * 4,
      product_views: Math.round(sessions * 1.8),
      add_to_carts: Math.round(sessions * 0.22),
      checkouts: Math.round(sessions * 0.08),
    };
  });
  await db.from("store_stats").insert(stats);

  // Subscription record for the paid store
  await db.from("store_admin").insert({ store_id: sid, owner_name: "متجر تجريبي", note: "متجر تجريبي للتجربة. ممكن تحذفه من صفحة البيانات التجريبية" });
  if (pack.sub !== "trial") {
    await db.from("subscription_payments").insert({ store_id: sid, amount: pack.sub === "paid" ? 45 : 15, currency: "USD", months: pack.sub === "paid" ? 3 : 1, method: "كاش", note: "دفعة تجريبية", paid_until: paidUntil });
  }
  return count;
}

/** Removes the sample stores and their logins (everything else in them goes too). */
export async function deleteSeedStores(): Promise<number> {
  const db = supabaseAdmin();
  const { data } = await db.from("stores").select("id, owner_id").in("slug", SEED_SLUGS);
  for (const s of data ?? []) {
    const { data: files } = await db.storage.from("media").list(s.id as string, { limit: 1000 });
    if (files?.length) await db.storage.from("media").remove(files.map((f) => `${s.id}/${f.name}`));
    await db.auth.admin.deleteUser(s.owner_id as string);
  }
  return data?.length ?? 0;
}
