import { PageHeader } from "@/components/admin-ui";
import { ProGate } from "@/components/pro-gate";
import { requireAccess } from "@/lib/auth";
import { isPro } from "@/lib/plans";
import { QuoteForm } from "./form";

export default async function NewQuotePage() {
  const { store } = await requireAccess("quotes");
  return (
    <div>
      <PageHeader title="عرض سعر جديد" back="/dashboard/quotes" />
      {isPro(store) ? (
        <QuoteForm currency={store.currency} />
      ) : (
        <ProGate feature="عروض الأسعار PDF" />
      )}
    </div>
  );
}
