import { PageHeader } from "@/components/admin-ui";
import { requireMerchant } from "@/lib/auth";
import { ManualOrderForm } from "./form";

export default async function NewOrderPage({ searchParams }: { searchParams: Promise<{ customer?: string }> }) {
  const { store, db } = await requireMerchant();
  const { customer } = await searchParams;
  const { data: c } =
    customer && /^[0-9a-f-]{36}$/.test(customer)
      ? await db.from("customers").select("name, phone, city, address").eq("id", customer).eq("store_id", store.id).maybeSingle()
      : { data: null };
  return (
    <div>
      <PageHeader title="طلب يدوي جديد" back="/dashboard/orders" />
      <ManualOrderForm currency={store.currency} defaultCity={store.city ?? ""} customer={c ?? undefined} delivery={Boolean(store.shipping?.delivery)} />
    </div>
  );
}
