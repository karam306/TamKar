import "server-only";
import { after } from "next/server";
import { PLATFORM_DOMAIN } from "./brand";
import { isPro } from "./plans";
import { hasSupabase, supabaseAdmin } from "./supabase";

// Automatic Meta connection ("managed" option).
// Everything lives in the Kun business account on Meta: a system user token creates a pixel
// and a catalog for each store, links them, adds the store's product feed, and makes one
// product set per collection. The merchant only accepts the partner request for their page.
// The other option ("manual") is the merchant pasting their own pixel and token, as before.
//
// Vercel settings needed (see /admin/meta for the step by step guide):
//   META_SYSTEM_TOKEN   system user token (ads_management, business_management, catalog_management)
//   META_BUSINESS_ID    the Kun business portfolio id
//   META_AD_ACCOUNT_ID  optional: ad account the pixels are shared with (digits, with or without act_)

const GRAPH = "https://graph.facebook.com/v21.0";

export type MetaConfig = { token: string; business: string; adAccount: string | null };

export function metaConfig(): MetaConfig | null {
  const token = process.env.META_SYSTEM_TOKEN?.trim();
  const business = process.env.META_BUSINESS_ID?.replace(/\D/g, "");
  if (!token || !business) return null;
  const ad = process.env.META_AD_ACCOUNT_ID?.replace(/\D/g, "");
  return { token, business, adAccount: ad || null };
}

export type StoreMeta = {
  store_id: string;
  mode: "manual" | "managed";
  status: "off" | "requested" | "active" | "stopped";
  requested_at: string | null;
  page_url: string | null;
  pixel_id: string | null;
  catalog_id: string | null;
  feed_id: string | null;
  product_sets: Record<string, string>;
  activated_at: string | null;
  stopped_at: string | null;
  last_sync_at: string | null;
  last_error: string | null;
};

/** Null when there is no row yet. `missing` is true when update 012 has not been run. */
export async function getStoreMeta(storeId: string): Promise<{ row: StoreMeta | null; missing: boolean }> {
  if (!hasSupabase) return { row: null, missing: false };
  const { data, error } = await supabaseAdmin().from("store_meta").select("*").eq("store_id", storeId).maybeSingle();
  if (error) return { row: null, missing: true };
  return { row: (data as StoreMeta) ?? null, missing: false };
}

async function saveMeta(storeId: string, patch: Partial<StoreMeta>) {
  const { error } = await supabaseAdmin()
    .from("store_meta")
    .upsert({ store_id: storeId, ...patch, updated_at: new Date().toISOString() }, { onConflict: "store_id" });
  if (error) throw new Error("تعذّر الحفظ في قاعدة البيانات. هل نفّذت التحديث 012؟");
}

export const isManagedActive = (m: StoreMeta | null) => Boolean(m && m.mode === "managed" && m.status === "active" && m.pixel_id);

/**
 * Pixel and token the store should use, whichever option is on.
 * Managed (Kun account) wins when active; otherwise the merchant's own pixel on the Pro plan.
 */
export async function storePixel(store: {
  id: string;
  plan?: string | null;
  paid_until?: string | null;
  meta_pixel_id?: string | null;
  meta_capi_token?: string | null;
}): Promise<{ pixel: string; token: string | null } | null> {
  try {
    const { row } = await getStoreMeta(store.id);
    const cfg = metaConfig();
    if (!isPro(store as Parameters<typeof isPro>[0])) return null; // Meta is a Pro feature, both options
    if (isManagedActive(row) && cfg) return { pixel: row!.pixel_id!, token: cfg.token };
  } catch {}
  if (store.meta_pixel_id) return { pixel: store.meta_pixel_id, token: store.meta_capi_token ?? null };
  return null;
}

// ───────────── Graph API ─────────────

class MetaError extends Error {}

async function graph(method: "GET" | "POST" | "DELETE", path: string, params: Record<string, unknown> = {}) {
  const cfg = metaConfig();
  if (!cfg) throw new MetaError("إعدادات Meta غير موجودة في Vercel بعد");
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v != null) body.set(k, typeof v === "string" ? v : JSON.stringify(v));
  body.set("access_token", cfg.token);
  const url = method === "POST" ? `${GRAPH}/${path}` : `${GRAPH}/${path}?${body}`;
  const res = await fetch(url, {
    method,
    headers: method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : undefined,
    body: method === "POST" ? body : undefined,
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown> & {
    error?: { message?: string; error_user_msg?: string; code?: number };
  };
  if (!res.ok || json.error) {
    const e = json.error;
    throw new MetaError(`Meta: ${e?.error_user_msg || e?.message || res.status}`);
  }
  return json;
}

const errText = (e: unknown) => (e instanceof Error ? e.message : "خطأ غير معروف").slice(0, 400);

export function feedUrl(slug: string, bust = false) {
  return `https://${PLATFORM_DOMAIN}/api/feed/${slug}.csv${bust ? `?v=${Date.now()}` : ""}`;
}

/** Checks the token and business id. Used by the test button on /admin/meta. */
export async function testConnection(): Promise<{ ok: string } | { error: string }> {
  try {
    const cfg = metaConfig();
    if (!cfg) return { error: "أضف META_SYSTEM_TOKEN و META_BUSINESS_ID في Vercel أولاً" };
    const me = await graph("GET", "me", { fields: "id,name" });
    const biz = await graph("GET", cfg.business, { fields: "id,name" });
    let ad = "";
    if (cfg.adAccount) {
      const a = await graph("GET", `act_${cfg.adAccount}`, { fields: "name,account_status,currency" });
      ad = ` · حساب الإعلانات: ${a.name} (${a.currency})`;
    }
    return { ok: `✓ الاتصال يعمل. المستخدم: ${me.name} · النشاط التجاري: ${biz.name}${ad}` };
  } catch (e) {
    return { error: errText(e) };
  }
}

type StoreInfo = { id: string; slug: string; name: string };

async function collectionTitles(storeId: string): Promise<string[]> {
  const { data } = await supabaseAdmin().from("collections").select("title").eq("store_id", storeId);
  return [...new Set((data ?? []).map((c) => String(c.title)).filter(Boolean))];
}

/** One product set per collection, using the collection name the feed puts in custom_label_0. */
async function syncProductSets(storeId: string, catalogId: string, current: Record<string, string>) {
  const sets = { ...current };
  for (const title of await collectionTitles(storeId)) {
    if (sets[title]) continue;
    const r = await graph("POST", `${catalogId}/product_sets`, {
      name: title,
      filter: { custom_label_0: { i_contains: title } },
    });
    sets[title] = String(r.id);
  }
  return sets;
}

/**
 * Turns the automatic connection on. Each step saves what it made, so pressing the
 * button again after an error continues where it stopped instead of making duplicates.
 * A store that was stopped before gets its old pixel back (its history is kept).
 */
export async function activateManaged(store: StoreInfo): Promise<{ ok: string } | { error: string }> {
  const cfg = metaConfig();
  if (!cfg) return { error: "أكمل إعداد Meta أولاً من صفحة ميتا في لوحة المنصة" };
  const { row, missing } = await getStoreMeta(store.id);
  if (missing) return { error: "نفّذ التحديث 012 في Supabase أولاً" };
  const m: Partial<StoreMeta> = { ...(row ?? {}), mode: "managed" };
  const label = `${store.name} · ${store.slug}`;
  try {
    if (!m.pixel_id) {
      const r = await graph("POST", `${cfg.business}/adspixels`, { name: `كُن: ${label}` });
      m.pixel_id = String(r.id);
      await saveMeta(store.id, { mode: "managed", pixel_id: m.pixel_id });
    } else {
      await graph("POST", m.pixel_id, { name: `كُن: ${label}` }).catch(() => {});
    }
    if (cfg.adAccount) {
      await graph("POST", `${m.pixel_id}/shared_accounts`, { account_id: cfg.adAccount, business: cfg.business }).catch((e) => {
        // already shared is fine
        if (!/already|exist/i.test(errText(e))) throw e;
      });
    }
    if (!m.catalog_id) {
      const r = await graph("POST", `${cfg.business}/owned_product_catalogs`, { name: `كُن: ${label}`, vertical: "commerce" });
      m.catalog_id = String(r.id);
      m.product_sets = {};
      m.feed_id = null;
      await saveMeta(store.id, { catalog_id: m.catalog_id, product_sets: {}, feed_id: null });
      await graph("POST", `${m.catalog_id}/external_event_sources`, { external_event_sources: [m.pixel_id] });
    }
    if (!m.feed_id) {
      const r = await graph("POST", `${m.catalog_id}/product_feeds`, {
        name: `منتجات ${store.name}`,
        schedule: { interval: "HOURLY", url: feedUrl(store.slug) },
      });
      m.feed_id = String(r.id);
      await saveMeta(store.id, { feed_id: m.feed_id });
    }
    await graph("POST", `${m.feed_id}/uploads`, { url: feedUrl(store.slug, true) });
    m.product_sets = await syncProductSets(store.id, m.catalog_id!, m.product_sets ?? {});
    const now = new Date().toISOString();
    await saveMeta(store.id, {
      mode: "managed",
      status: "active",
      product_sets: m.product_sets,
      activated_at: now,
      last_sync_at: now,
      last_error: null,
      stopped_at: null,
    });
    return { ok: "✓ تم تفعيل الربط التلقائي. ستظهر المنتجات في الكتالوج خلال دقائق" };
  } catch (e) {
    await saveMeta(store.id, { last_error: errText(e) }).catch(() => {});
    return { error: `${errText(e)}. ما تمّ إنشاؤه محفوظ، اضغط «تفعيل» مرة أخرى للمتابعة` };
  }
}

/**
 * Turns the automatic connection off: the store stops sending events, the pixel is
 * unshared from the ad account and marked as stopped, and the catalog is deleted.
 * The pixel id is kept (Meta does not reliably allow deleting pixels) so a returning
 * store reuses it. Campaigns are not touched here: pause them in Ads Manager.
 */
export async function stopManaged(store: StoreInfo): Promise<{ ok: string } | { error: string }> {
  const { row, missing } = await getStoreMeta(store.id);
  if (missing) return { error: "نفّذ التحديث 012 في Supabase أولاً" };
  if (!row) return { ok: "الربط التلقائي غير مفعّل لهذا المتجر" };
  // Events stop at once, even if a Meta call below fails.
  await saveMeta(store.id, { status: "stopped", stopped_at: new Date().toISOString() });
  const cfg = metaConfig();
  const problems: string[] = [];
  if (cfg && row.pixel_id) {
    if (cfg.adAccount)
      await graph("DELETE", `${row.pixel_id}/shared_accounts`, { account_id: cfg.adAccount, business: cfg.business }).catch((e) => problems.push(errText(e)));
    await graph("POST", row.pixel_id, { name: `كُن (متوقف): ${store.name} · ${store.slug}` }).catch((e) => problems.push(errText(e)));
  }
  if (cfg && row.catalog_id) {
    const deleted = await graph("DELETE", row.catalog_id, { allow_delete_catalog_with_live_product_set: true })
      .then(() => true)
      .catch((e) => {
        problems.push(errText(e));
        return false;
      });
    if (deleted) await saveMeta(store.id, { catalog_id: null, feed_id: null, product_sets: {} });
  }
  await saveMeta(store.id, { last_error: problems.length ? problems.join(" | ").slice(0, 400) : null });
  return problems.length
    ? { error: `أُوقف إرسال الأحداث، لكن بقيت خطوات لم تكتمل في Meta: ${problems[0]}` }
    : { ok: "✓ تم إيقاف ربط Meta لهذا المتجر وحذف الكتالوج" };
}

/**
 * Sends the latest products to the store's catalog now (instead of waiting for the hourly
 * fetch) and adds product sets for new collections. Called after products or collections change.
 */
export async function syncCatalog(storeId: string): Promise<{ ok: string } | { error: string }> {
  try {
    const { row } = await getStoreMeta(storeId);
    if (!isManagedActive(row) || !row!.feed_id || !row!.catalog_id || !metaConfig()) return { ok: "" };
    const { data: store } = await supabaseAdmin().from("stores").select("slug").eq("id", storeId).maybeSingle();
    if (!store) return { ok: "" };
    await graph("POST", `${row!.feed_id}/uploads`, { url: feedUrl(String(store.slug), true) });
    const sets = await syncProductSets(storeId, row!.catalog_id!, row!.product_sets ?? {});
    await saveMeta(storeId, { product_sets: sets, last_sync_at: new Date().toISOString(), last_error: null });
    return { ok: "✓ أُرسلت المنتجات إلى الكتالوج" };
  } catch (e) {
    await saveMeta(storeId, { last_error: errText(e) }).catch(() => {});
    return { error: errText(e) };
  }
}

/** Merchant chose "let the Kun team connect Meta for me". */
export async function requestManaged(storeId: string, pageUrl: string) {
  const { row, missing } = await getStoreMeta(storeId);
  if (missing) throw new Error("هذه الميزة غير مفعّلة بعد، تواصل مع فريق كُن");
  if (isManagedActive(row)) return;
  await saveMeta(storeId, { status: "requested", requested_at: new Date().toISOString(), page_url: pageUrl || row?.page_url || null });
}

export async function cancelRequest(storeId: string) {
  const { row } = await getStoreMeta(storeId);
  if (row?.status === "requested") await saveMeta(storeId, { status: "off" });
}

/** Run syncCatalog after the response is sent, so saving a product never waits for Meta. */
export function syncCatalogLater(storeId: string) {
  try {
    after(() => syncCatalog(storeId).then(() => undefined));
  } catch {}
}
