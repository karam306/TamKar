import { PageHeader } from "@/components/admin-ui";
import { requireOwner } from "@/lib/auth";
import { DiscountForm } from "../discount-form";

export default async function NewDiscountPage() {
  const { store } = await requireOwner();
  return (
    <div>
      <PageHeader title="خصم جديد" back="/dashboard/discounts" />
      <DiscountForm currency={store.currency} />
    </div>
  );
}
