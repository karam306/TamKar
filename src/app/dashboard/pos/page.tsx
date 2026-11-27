import { PageHeader } from "@/components/admin-ui";
import { requireAccess } from "@/lib/auth";
import { liveFx } from "@/lib/fx";
import type { Variant } from "@/lib/types";
import { storeWallets } from "@/lib/wallets";
import { Sell, type PosProduct } from "./sell";

/** Selling inside the shop from a phone or computer. */
export default async function PosPage() {
  const { store, db } = await requireAccess("orders");
  const { data } = await db
    .from("products")
    .select("id, title, price, images, sku, category, stock, variants")
    .eq("store_id", store.id)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(3000);
  const products: PosProduct[] = (data ?? []).map((p) => ({
    id: p.id as string,
    title: p.title as string,
    price: Number(p.price),
    image: ((p.images as string[] | null) ?? [])[0] ?? null,
    sku: (p.sku as string | null) ?? null,
    category: (p.category as string | null) ?? null,
    stock: p.stock == null ? null : Number(p.stock),
    variants: ((p.variants as Variant[] | null) ?? []).map((v) => ({ ...v, price: Number(v.price) })),
  }));
  return (
    <div>
      <PageHeader title="بيع في المحل" />
      <Sell
        products={products}
        currency={store.currency}
        fx={liveFx(store)}
        wallets={storeWallets(store).map((w) => w.id)}
      />
    </div>
  );
}
