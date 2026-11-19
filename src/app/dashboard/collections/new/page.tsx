import { PageHeader } from "@/components/admin-ui";
import { requireMerchant } from "@/lib/auth";
import { CollectionForm } from "../collection-form";

export default async function NewCollectionPage() {
  await requireMerchant();
  return (
    <div>
      <PageHeader title="مجموعة جديدة" back="/dashboard/collections" />
      <CollectionForm />
    </div>
  );
}
