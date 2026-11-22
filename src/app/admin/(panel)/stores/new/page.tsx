import { PageHeader } from "@/components/admin-ui";
import { NewMerchantForm } from "./form";

export default function NewStorePage() {
  return (
    <div>
      <PageHeader title="متجر جديد لتاجر" back="/admin/stores" />
      <NewMerchantForm />
    </div>
  );
}
