import { PageHeader } from "@/components/admin-ui";
import { requireAccess } from "@/lib/auth";
import { PageForm } from "../page-form";

export default async function NewPage() {
  await requireAccess("design");
  return (
    <div>
      <PageHeader title="صفحة جديدة" back="/dashboard/pages" />
      <PageForm />
    </div>
  );
}
