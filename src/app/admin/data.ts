import "server-only";
import { supabaseAdmin } from "@/lib/supabase";

export type AdminStore = {
  id: string;
  slug: string;
  name: string;
  owner_id: string;
  business_type: string;
  status: string;
  plan: string;
  paid_until: string | null;
  /** Store that invited this one (update 014), and when both got their free month. */
  invited_by?: string | null;
  referral_rewarded_at?: string | null;
  currency: "USD" | "SYP";
  whatsapp: string;
  city: string | null;
  created_at: string;
  custom_domain: string | null;
  email?: string;
  owner_name?: string | null;
  owner_phone?: string | null;
  note?: string | null;
  salesman_id?: string | null;
  heard_from?: string | null;
  telegram?: boolean;
  orders30: number;
  sales30: number;
  products: number;
};

/** Every store with owner email, private notes and last-30-days numbers. */
export async function loadStores(): Promise<AdminStore[]> {
  const admin = supabaseAdmin();
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const [{ data: stores }, { data: extra }, { data: orders }, users] = await Promise.all([
    admin.from("stores").select("id, slug, name, owner_id, business_type, status, plan, paid_until, currency, whatsapp, city, created_at, custom_domain").order("created_at", { ascending: false }),
    admin.from("store_admin").select("*"),
    admin.from("orders").select("store_id, total, status").gte("created_at", since).neq("status", "cancelled").limit(100000),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ]);
  const emails = new Map((users.data?.users ?? []).map((u) => [u.id, u.email ?? ""]));
  const notes = new Map((extra ?? []).map((e) => [e.store_id as string, e]));
  const agg = new Map<string, { n: number; s: number }>();
  for (const o of orders ?? []) {
    const a = agg.get(o.store_id as string) ?? { n: 0, s: 0 };
    a.n += 1;
    a.s += Number(o.total);
    agg.set(o.store_id as string, a);
  }
  const counts = await Promise.all(
    (stores ?? []).map((s) => admin.from("products").select("id", { count: "exact", head: true }).eq("store_id", s.id)),
  );
  return (stores ?? []).map((s, i) => ({
    ...(s as Omit<AdminStore, "orders30" | "sales30" | "products">),
    email: emails.get(s.owner_id as string),
    owner_name: notes.get(s.id as string)?.owner_name ?? null,
    owner_phone: notes.get(s.id as string)?.owner_phone ?? null,
    note: notes.get(s.id as string)?.note ?? null,
    salesman_id: (notes.get(s.id as string)?.salesman_id as string | null) ?? null,
    heard_from: (notes.get(s.id as string)?.heard_from as string | null) ?? null,
    telegram: Boolean(notes.get(s.id as string)?.telegram_chat_id),
    invited_by: (notes.get(s.id as string)?.invited_by as string | null) ?? null,
    referral_rewarded_at: (notes.get(s.id as string)?.referral_rewarded_at as string | null) ?? null,
    orders30: agg.get(s.id as string)?.n ?? 0,
    sales30: agg.get(s.id as string)?.s ?? 0,
    products: counts[i].count ?? 0,
  }));
}

export type Salesman = { id: string; code: string; name: string; phone: string | null; active: boolean; created_at: string };

/** Salesmen (empty until update 010 is run in Supabase). */
export async function loadSalesmen(): Promise<Salesman[]> {
  const { data, error } = await supabaseAdmin().from("salesmen").select("*").order("created_at");
  if (error) return [];
  return (data as Salesman[]) ?? [];
}
