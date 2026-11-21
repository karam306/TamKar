import { PageHeader } from "@/components/admin-ui";
import { requireOwner } from "@/lib/auth";
import { PageForm } from "../page-form";

export default async function NewPage() {
  await requireOwner();
  return (
    <div>
      <PageHeader title="صفحة جديدة" back="/dashboard/pages" />
      <PageForm />
    </div>
  );
}
