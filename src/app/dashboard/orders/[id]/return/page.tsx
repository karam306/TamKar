import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin-ui";
import { requireAccess } from "@/lib/auth";
import type { Order, OrderReturn } from "@/lib/types";
import { storeWallets, WALLETS } from "@/lib/wallets";
import { ReturnForm } from "./form";

export default async function ReturnPage({ params }: { params: Promise<{ id: string }> }) {
  const { store, db } = await requireAccess("orders");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [{ data }, { data: rows }] = await Promise.all([
    db.from("orders").select("*").eq("id", id).eq("store_id", store.id).maybeSingle(),
    db.from("order_returns").select("*").eq("order_id", id).eq("store_id", store.id),
  ]);
  if (!data) notFound();
  const o = data as Order;
  const returns = (rows ?? []) as OrderReturn[];
  const key = (p: string, v?: string | null) => `${p}|${v ?? ""}`;
  const returned = new Map<string, number>();
  for (const r of returns) for (const i of r.items) returned.set(key(i.productId, i.variantId), (returned.get(key(i.productId, i.variantId)) ?? 0) + i.qty);

  const lines = o.items.map((i) => ({
    productId: i.productId,
    variantId: i.variantId ?? undefined,
    title: i.title,
    variantTitle: i.variantTitle ?? undefined,
    price: Number(i.price),
    image: i.image ?? undefined,
    remaining: Math.max(0, i.qty - (returned.get(key(i.productId, i.variantId)) ?? 0)),
    ordered: i.qty,
  }));
  const extras = returns.reduce((t, r) => t + Number(r.extra_charge), 0);
  const maxRefund = Math.max(0, Number(o.total) + extras - Number((o as { refunded?: number }).refunded ?? 0));
  const methods = ["نقداً", ...storeWallets(store).map((w) => WALLETS[w.id].name), "طريقة أخرى"];

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={`استرجاع أو تبديل · طلب #${o.number}`} back={`/dashboard/orders/${o.id}`} />
      {o.status === "cancelled" ? (
        <p className="card p-4 text-[13px]">الطلب ملغي.</p>
      ) : (
        <ReturnForm
          orderId={o.id}
          currency={store.currency}
          lines={lines}
          maxRefund={maxRefund}
          hadDiscount={Number(o.discount_amount ?? 0) > 0}
          methods={methods}
          defaultMethod={o.payment_method && o.payment_method !== "cod" ? WALLETS[o.payment_method]?.name ?? "نقداً" : "نقداً"}
        />
      )}
    </div>
  );
}
