import { PageHeader } from "@/components/admin-ui";
import { requireMerchant } from "@/lib/auth";
import type { ShippingSettings } from "@/lib/types";
import { ShippingForm } from "./form";

export default async function ShippingPage() {
  const { store } = await requireMerchant();
  return (
    <div>
      <PageHeader title="الاستلام والتوصيل" back="/dashboard/settings" />
      <ShippingForm initial={(store as { shipping?: ShippingSettings }).shipping ?? {}} currency={store.currency} />
    </div>
  );
}
