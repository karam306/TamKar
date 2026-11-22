import { PageHeader } from "@/components/admin-ui";
import { requireOwner } from "@/lib/auth";
import { PaymentsForm } from "./form";

export default async function PaymentsPage() {
  const { store } = await requireOwner();
  const p = store.shipping?.payments ?? {};
  return (
    <div>
      <PageHeader title="طرق الدفع" back="/dashboard/settings" />
      <PaymentsForm cod={p.cod !== false} wallets={p.wallets ?? []} />
    </div>
  );
}
