import { PageHeader } from "@/components/admin-ui";
import { requireMerchant } from "@/lib/auth";
import { DiscountForm } from "../discount-form";

export default async function NewDiscountPage() {
  const { store } = await requireMerchant();
  return (
    <div>
      <PageHeader title="خصم جديد" back="/dashboard/discounts" />
      <DiscountForm currency={store.currency} />
    </div>
  );
}
