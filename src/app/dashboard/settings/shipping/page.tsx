import { PageHeader } from "@/components/admin-ui";
import { requireOwner } from "@/lib/auth";
import type { ShippingSettings } from "@/lib/types";
import { ShippingForm } from "./form";
import { isPro } from "@/lib/plans";

export default async function ShippingPage() {
  const { store } = await requireOwner();
  return (
    <div>
      <PageHeader title="الاستلام والتوصيل" back="/dashboard/settings" />
      <ShippingForm initial={(store as { shipping?: ShippingSettings }).shipping ?? {}} currency={store.currency} pro={isPro(store)} />
    </div>
  );
}
