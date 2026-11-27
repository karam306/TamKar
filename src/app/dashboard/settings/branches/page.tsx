import { PageHeader } from "@/components/admin-ui";
import { ProGate } from "@/components/pro-gate";
import { requireOwner } from "@/lib/auth";
import { isPro, LIMITS } from "@/lib/plans";
import { BranchesForm } from "./form";

export default async function BranchesPage() {
  const { store } = await requireOwner();
  return (
    <div>
      <PageHeader title="الفروع" back="/dashboard/settings" />
      {isPro(store) ? (
        <BranchesForm
          initial={store.shipping?.branches ?? []}
          max={LIMITS.pro.branches - 1}
          main={{
            name: store.name,
            whatsapp: store.whatsapp,
            note: store.shipping?.pickup_note ?? "",
          }}
        />
      ) : (
        <ProGate feature="الفروع" />
      )}
    </div>
  );
}
