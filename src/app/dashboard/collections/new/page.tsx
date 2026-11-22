import { PageHeader } from "@/components/admin-ui";
import { requireAccess } from "@/lib/auth";
import { CollectionForm } from "../collection-form";

export default async function NewCollectionPage() {
  await requireAccess("products");
  return (
    <div>
      <PageHeader title="مجموعة جديدة" back="/dashboard/collections" />
      <CollectionForm />
    </div>
  );
}
