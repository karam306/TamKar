import Link from "next/link";
import { requireMerchant } from "@/lib/auth";
import { formatPrice } from "@/lib/format";
import type { Order } from "@/lib/types";
import { storeUrl } from "@/lib/urls";
import { CopyLink } from "./copy-link";
import { StatusBadge } from "./orders/status";
import { storeChat, telegramReady } from "@/lib/telegram";

export default async function DashboardHome({ searchParams }: { searchParams: Promise<{ welcome?: string; owner_only?: string }> }) {
  const { store, db, role } = await requireMerchant();
  const { welcome, owner_only } = await searchParams;

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [products, newOrders, monthOrders, latest] = await Promise.all([
    db.from("products").select("id", { count: "exact", head: true }).eq("store_id", store.id),
    db.from("orders").select("id", { count: "exact", head: true }).eq("store_id", store.id).eq("status", "new"),
    db.from("orders").select("total, status").eq("store_id", store.id).gte("created_at", monthStart.toISOString()),
    db.from("orders").select("*").eq("store_id", store.id).order("created_at", { ascending: false }).limit(5),
  ]);

  const month = (monthOrders.data ?? []).filter((o) => o.status !== "cancelled");
  const monthTotal = month.reduce((s, o) => s + Number(o.total), 0);
  const productCount = products.count ?? 0;
  const orders = (latest.data ?? []) as Order[];
  const url = storeUrl(store.slug);

  const telegramDone = role !== "owner" || !telegramReady() || Boolean(await storeChat(store.id));
  const steps = [
    { done: productCount > 0, label: "ضيف أول منتج", href: "/dashboard/products/new" },
    { done: telegramDone, label: "اربط تيليغرام ليوصلك كل طلب فوراً", href: "/dashboard/settings/notifications" },
    { done: store.sections.length > 0 && store.tagline != null, label: "خصّص شكل متجرك", href: "/dashboard/design" },
    { done: month.length > 0, label: "شارك رابط متجرك واستقبل أول طلب", href: "#share" },
  ];

  return (
    <div className="space-y-6">
      {owner_only && <div className="rounded-lg bg-[#fff4d6] p-3 text-[13px]">هالصفحة لصاحب المتجر بس.</div>}
      {welcome && (
        <div className="rounded-theme bg-primary p-5 text-white">
          <h1 className="text-2xl">🎉 مبروك، متجرك صار جاهز!</h1>
          <p className="mt-1 opacity-90">ضيف منتجاتك وشارك الرابط مع زبائنك.</p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="طلبات جديدة" value={String(newOrders.count ?? 0)} href="/dashboard/orders?status=new" />
        <Stat label="مبيعات هالشهر" value={formatPrice(monthTotal, store.currency)} sub={`${month.length} طلب`} />
        <Stat label="المنتجات" value={String(productCount)} href="/dashboard/products" />
      </div>

      <section id="share" className="card p-5">
        <h2 className="mb-2 text-lg">رابط متجرك</h2>
        <CopyLink url={url} />
      </section>

      {steps.some((s) => !s.done) && (
        <section className="card p-5">
          <h2 className="mb-3 text-lg">خطوات البداية</h2>
          <ul className="space-y-2">
            {steps.map((s) => (
              <li key={s.label}>
                <Link href={s.href} className="flex items-center gap-3">
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${s.done ? "bg-primary text-white" : "border border-black/20"}`}>
                    {s.done ? "✓" : ""}
                  </span>
                  <span className={s.done ? "text-muted line-through" : ""}>{s.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg">آخر الطلبات</h2>
          <Link href="/dashboard/orders" className="text-sm text-primary">
            كل الطلبات ←
          </Link>
        </div>
        {orders.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">ما في طلبات لسا. أول ما يطلب حدا رح يظهر هون.</p>
        ) : (
          <ul className="divide-y divide-black/5">
            {orders.map((o) => (
              <li key={o.id}>
                <Link href={`/dashboard/orders#o-${o.number}`} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <span>
                    #{o.number} · {o.customer_name}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="font-semibold">{formatPrice(Number(o.total), store.currency)}</span>
                    <StatusBadge status={o.status} pickup={o.fulfillment === "pickup"} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, sub, href }: { label: string; value: string; sub?: string; href?: string }) {
  const body = (
    <div className="card p-5">
      <div className="text-sm text-muted">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
      {sub && <div className="text-xs text-muted">{sub}</div>}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
