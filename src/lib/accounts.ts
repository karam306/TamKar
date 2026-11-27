import "server-only";
import { supabaseAdmin } from "./supabase";
import type { Order, OrderLine, Store } from "./types";

/** Shop accounts (update 018): shared helpers for expenses, profit, cash close and suppliers. */

export const EXPENSE_CATEGORIES = [
  "إيجار",
  "رواتب",
  "كهرباء وأمبيرات",
  "إنترنت واتصالات",
  "مواد وتغليف",
  "توصيل ونقل",
  "إعلانات",
  "صيانة",
  "ضرائب ورسوم",
  "أخرى",
] as const;

export const PAID_FROM: Record<string, string> = {
  cash: "نقداً",
  sham_cash: "شام كاش",
  syriatel_cash: "سيريتل كاش",
  mtn_cash: "MTN كاش",
  bank: "حساب بنكي",
  other: "أخرى",
};
export const cleanPaidFrom = (v: unknown) => (typeof v === "string" && v in PAID_FROM ? v : "cash");

/** Today's date in Damascus, YYYY-MM-DD. */
export const todayDamascus = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Damascus" });

/** A month key "YYYY-MM" from the URL, or the current month. */
export function monthKey(raw?: string | null) {
  return raw && /^\d{4}-(0[1-9]|1[0-2])$/.test(raw) ? raw : todayDamascus().slice(0, 7);
}
export function monthBounds(key: string) {
  const [y, m] = key.split("-").map(Number);
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  const prev = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
  return {
    first: `${key}-01`,
    nextFirst: `${next}-01`,
    // Orders are timestamps: the month in Damascus time.
    fromTs: `${key}-01T00:00:00+03:00`,
    toTs: `${next}-01T00:00:00+03:00`,
    prev,
    next,
  };
}
export const monthLabel = (key: string) =>
  new Intl.DateTimeFormat("ar-SY", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${key}-15T00:00:00Z`));
export const dayLabel = (d: string) =>
  new Intl.DateTimeFormat("ar-SY", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${d.slice(0, 10)}T12:00:00Z`));

export const branchName = (store: Store, id: string) =>
  id ? (store.shipping?.branches ?? []).find((b) => b.id === id)?.name ?? "فرع" : "المحل الرئيسي";
export const branchList = (store: Store) => [
  { id: "", name: "المحل الرئيسي" },
  ...(store.shipping?.branches ?? []).map((b) => ({ id: b.id, name: b.name })),
];

/** Adds this month's repeating expenses (rent, salaries...) once their day has come. */
export async function ensureRecurring(storeId: string) {
  const db = supabaseAdmin();
  const today = todayDamascus();
  const month = today.slice(0, 7);
  const dom = Number(today.slice(8, 10));
  const { data } = await db.from("recurring_expenses").select("*").eq("store_id", storeId).eq("active", true);
  for (const r of data ?? []) {
    if (r.last_month === month || dom < r.day_of_month) continue;
    // Claim the month first so two page loads never add it twice.
    const { data: claimed } = await db
      .from("recurring_expenses")
      .update({ last_month: month })
      .eq("id", r.id)
      .or(`last_month.is.null,last_month.neq.${month}`)
      .select("id");
    if (!claimed?.length) continue;
    await db.from("expenses").insert({
      store_id: storeId,
      day: `${month}-${String(r.day_of_month).padStart(2, "0")}`,
      amount: r.amount,
      category: r.category,
      note: r.note,
      paid_from: r.paid_from,
      branch: r.branch,
      recurring_id: r.id,
    });
  }
}

export type Costs = Map<string, { cost: number | null; variants: Record<string, number> }>;

export async function loadCosts(storeId: string): Promise<Costs> {
  const { data } = await supabaseAdmin().from("product_costs").select("product_id, cost, variant_costs").eq("store_id", storeId);
  return new Map(
    (data ?? []).map((r) => [
      r.product_id as string,
      { cost: r.cost == null ? null : Number(r.cost), variants: (r.variant_costs as Record<string, number>) ?? {} },
    ]),
  );
}

/** Today's cost of one order line, or null when unknown. */
export function lineCost(costs: Costs, l: OrderLine): number | null {
  const c = costs.get(l.productId);
  if (!c) return null;
  const v = l.variantTitle ? c.variants[l.variantTitle] : undefined;
  const unit = v != null ? Number(v) : c.cost;
  return unit == null ? null : unit * Number(l.qty || 0);
}

export type ProfitOrder = Pick<Order, "id" | "items" | "total" | "refunded" | "status" | "in_store" | "created_at"> & {
  shipping_fee?: number | null;
  discount_amount?: number | null;
  branch?: string | null;
  payment_method?: string | null;
  payment_status?: string | null;
  on_credit?: boolean | null;
};

/**
 * Sales and cost of goods for a set of orders. Uses the cost saved when each order was made
 * (update 018), or today's cost for older orders. Delivery fees are kept apart: they usually go
 * to the driver, so they are not counted as sales.
 */
export function profitOf(orders: ProfitOrder[], saved: Map<string, { cost: number; missing: number }>, costs: Costs) {
  let sales = 0, delivery = 0, discounts = 0, cogs = 0, missingLines = 0, online = 0, shop = 0;
  for (const o of orders) {
    if (o.status === "cancelled") continue;
    const total = Number(o.total) || 0;
    const fee = Number(o.shipping_fee ?? 0) || 0;
    const refunded = Number(o.refunded ?? 0) || 0;
    const net = Math.max(0, total - fee - refunded);
    sales += net;
    delivery += fee;
    discounts += Number(o.discount_amount ?? 0) || 0;
    if (o.in_store) shop += net;
    else online += net;
    // Money given back: count the same share of the goods as returned.
    const keep = total - fee > 0 ? net / (total - fee) : 1;
    const s = saved.get(o.id);
    if (s) {
      cogs += s.cost * keep;
      missingLines += s.missing;
    } else {
      for (const l of o.items ?? []) {
        const c = lineCost(costs, l);
        if (c == null) missingLines++;
        else cogs += c * keep;
      }
    }
  }
  return { sales, delivery, discounts, cogs, missingLines, online, shop };
}

export async function loadSavedCosts(orderIds: string[]) {
  const map = new Map<string, { cost: number; missing: number }>();
  const db = supabaseAdmin();
  for (let i = 0; i < orderIds.length; i += 300) {
    const { data } = await db.from("order_costs").select("order_id, cost, missing").in("order_id", orderIds.slice(i, i + 300));
    for (const r of data ?? []) map.set(r.order_id as string, { cost: Number(r.cost), missing: Number(r.missing) });
  }
  return map;
}

/** Orders of a period, for the accounts pages (owner only, server side). */
export async function ordersBetween(storeId: string, fromTs: string, toTs: string) {
  const { data } = await supabaseAdmin()
    .from("orders")
    .select("id, items, total, refunded, status, in_store, created_at, shipping_fee, discount_amount, branch, payment_method, payment_status, on_credit")
    .eq("store_id", storeId)
    .gte("created_at", fromTs)
    .lt("created_at", toTs)
    .limit(20000);
  return (data ?? []) as ProfitOrder[];
}

/** What the shop owes each supplier: invoices minus what was paid. */
export async function supplierBalances(storeId: string) {
  const db = supabaseAdmin();
  const [{ data: buys }, { data: pays }] = await Promise.all([
    db.from("purchases").select("supplier_id, total, paid").eq("store_id", storeId).limit(20000),
    db.from("supplier_payments").select("supplier_id, amount").eq("store_id", storeId).limit(20000),
  ]);
  const owed = new Map<string, number>();
  for (const b of buys ?? []) if (b.supplier_id) owed.set(b.supplier_id, (owed.get(b.supplier_id) ?? 0) + Number(b.total) - Number(b.paid));
  for (const p of pays ?? []) owed.set(p.supplier_id, (owed.get(p.supplier_id) ?? 0) - Number(p.amount));
  return owed;
}
