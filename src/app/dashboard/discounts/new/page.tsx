import { PageHeader } from "@/components/admin-ui";
import { requireAccess } from "@/lib/auth";
import { DiscountForm } from "../discount-form";

export default async function NewDiscountPage() {
  const { store } = await requireAccess("discounts");
  return (
    <div>
      <PageHeader title="خصم جديد" back="/dashboard/discounts" />
      <DiscountForm currency={store.currency} />
    </div>
  );
}
