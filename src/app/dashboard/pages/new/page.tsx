import { PageHeader } from "@/components/admin-ui";
import { requireMerchant } from "@/lib/auth";
import { PageForm } from "../page-form";

export default async function NewPage() {
  await requireMerchant();
  return (
    <div>
      <PageHeader title="صفحة جديدة" back="/dashboard/pages" />
      <PageForm />
    </div>
  );
}
